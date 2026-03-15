import SwiftUI

/// Renders text with **bold** markdown syntax as styled `Text` views.
/// Supports `**bold**` patterns inline. Everything else renders as regular text.
struct MarkdownBoldText: View {
    let text: String

    init(_ text: String) {
        self.text = text
    }

    var body: some View {
        parsedText
    }

    private var parsedText: Text {
        let parts = Self.parse(text)
        var result = Text("")
        for part in parts {
            if part.isBold {
                result = result + Text(part.text).bold()
            } else {
                result = result + Text(part.text)
            }
        }
        return result
    }

    private struct TextPart {
        let text: String
        let isBold: Bool
    }

    private static func parse(_ input: String) -> [TextPart] {
        guard let regex = try? NSRegularExpression(pattern: #"\*\*(.+?)\*\*"#) else {
            return [TextPart(text: input, isBold: false)]
        }

        let nsString = input as NSString
        let matches = regex.matches(in: input, range: NSRange(location: 0, length: nsString.length))

        if matches.isEmpty {
            return [TextPart(text: input, isBold: false)]
        }

        var parts: [TextPart] = []
        var lastEnd = 0

        for match in matches {
            let matchRange = match.range
            let captureRange = match.range(at: 1)

            // Text before the bold
            if matchRange.location > lastEnd {
                let before = nsString.substring(with: NSRange(location: lastEnd, length: matchRange.location - lastEnd))
                if !before.isEmpty {
                    parts.append(TextPart(text: before, isBold: false))
                }
            }

            // Bold text (capture group 1)
            let boldText = nsString.substring(with: captureRange)
            parts.append(TextPart(text: boldText, isBold: true))

            lastEnd = matchRange.location + matchRange.length
        }

        // Remaining text
        if lastEnd < nsString.length {
            let remaining = nsString.substring(from: lastEnd)
            if !remaining.isEmpty {
                parts.append(TextPart(text: remaining, isBold: false))
            }
        }

        return parts
    }
}
