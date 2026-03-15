import SwiftUI

/// A text view that scans for known glossary abbreviations and highlights them.
/// Tapping a highlighted term opens a GlossaryQuickSheet with the definition.
/// Also splits multi-line text into spaced paragraphs for readability.
struct GlossaryLinkedText: View {
    let text: String
    @State private var sheetTerm: GlossaryTerm?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(Array(lines.enumerated()), id: \.offset) { _, line in
                if line.isEmpty {
                    Spacer().frame(height: 4)
                } else {
                    buildAttributedText(for: line)
                }
            }
        }
        .environment(\.openURL, OpenURLAction { url in
            if url.scheme == "glossary",
               let slug = url.host(),
               let term = GlossaryCache.shared.lookup(slug: slug) {
                sheetTerm = term
                return .handled
            }
            return .systemAction
        })
        .sheet(item: $sheetTerm) { term in
            GlossaryQuickSheet(term: term)
        }
    }

    private var lines: [String] {
        text.components(separatedBy: "\n")
    }

    // MARK: - Attributed Text

    private func buildAttributedText(for line: String) -> some View {
        Text(attributedString(for: line))
            .multilineTextAlignment(.leading)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func attributedString(for line: String) -> AttributedString {
        let cache = GlossaryCache.shared
        guard cache.isLoaded else { return AttributedString(line) }

        let searchable = cache.allAbbreviations()
        guard !searchable.isEmpty else { return AttributedString(line) }

        // Build regex from all known terms, longest first to avoid partial matches
        let sorted = searchable.sorted { $0.count > $1.count }
        let escaped = sorted.map { NSRegularExpression.escapedPattern(for: $0) }
        let pattern = "\\b(" + escaped.joined(separator: "|") + ")\\b"

        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else {
            return AttributedString(line)
        }

        let nsText = line as NSString
        let fullRange = NSRange(location: 0, length: nsText.length)
        let matches = regex.matches(in: line, options: [], range: fullRange)

        guard !matches.isEmpty else { return AttributedString(line) }

        var result = AttributedString()
        var lastEnd = 0

        for match in matches {
            let matchRange = match.range

            // Plain text before this match
            if matchRange.location > lastEnd {
                let plainRange = NSRange(location: lastEnd, length: matchRange.location - lastEnd)
                result += AttributedString(nsText.substring(with: plainRange))
            }

            // Matched term
            let matchedStr = nsText.substring(with: matchRange)
            if let term = cache.lookup(abbreviation: matchedStr) {
                var attr = AttributedString(matchedStr)
                attr.foregroundColor = Color(hex: "#FF6B6B")
                attr.underlineStyle = .single
                attr.link = URL(string: "glossary://\(term.slug)")
                result += attr
            } else {
                result += AttributedString(matchedStr)
            }

            lastEnd = matchRange.location + matchRange.length
        }

        // Remaining text after last match
        if lastEnd < nsText.length {
            let remaining = NSRange(location: lastEnd, length: nsText.length - lastEnd)
            result += AttributedString(nsText.substring(with: remaining))
        }

        return result
    }

    // MARK: - Segment Building (for foundTerms)

    struct Segment {
        let text: String
        let term: GlossaryTerm?
    }

    func buildSegments(for line: String) -> [Segment] {
        let cache = GlossaryCache.shared
        guard cache.isLoaded else { return [Segment(text: line, term: nil)] }

        let searchable = cache.allAbbreviations()
        guard !searchable.isEmpty else { return [Segment(text: line, term: nil)] }

        let sorted = searchable.sorted { $0.count > $1.count }
        let escaped = sorted.map { NSRegularExpression.escapedPattern(for: $0) }
        let pattern = "\\b(" + escaped.joined(separator: "|") + ")\\b"

        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else {
            return [Segment(text: line, term: nil)]
        }

        let nsText = line as NSString
        let fullRange = NSRange(location: 0, length: nsText.length)
        let matches = regex.matches(in: line, options: [], range: fullRange)

        guard !matches.isEmpty else { return [Segment(text: line, term: nil)] }

        var segments: [Segment] = []
        var lastEnd = 0

        for match in matches {
            let matchRange = match.range
            if matchRange.location > lastEnd {
                let plainRange = NSRange(location: lastEnd, length: matchRange.location - lastEnd)
                segments.append(Segment(text: nsText.substring(with: plainRange), term: nil))
            }

            let matchedStr = nsText.substring(with: matchRange)
            if let term = cache.lookup(abbreviation: matchedStr) {
                segments.append(Segment(text: matchedStr, term: term))
            } else {
                segments.append(Segment(text: matchedStr, term: nil))
            }

            lastEnd = matchRange.location + matchRange.length
        }

        if lastEnd < nsText.length {
            let remaining = NSRange(location: lastEnd, length: nsText.length - lastEnd)
            segments.append(Segment(text: nsText.substring(with: remaining), term: nil))
        }

        return segments
    }

    /// Returns all unique glossary terms found in the full text
    func foundTerms() -> [GlossaryTerm] {
        var seen = Set<String>()
        var result: [GlossaryTerm] = []
        for line in lines {
            for segment in buildSegments(for: line) {
                if let term = segment.term, !seen.contains(term.id) {
                    seen.insert(term.id)
                    result.append(term)
                }
            }
        }
        return result
    }
}

// Make GlossaryTerm work with .sheet(item:)
extension GlossaryTerm: Hashable {
    static func == (lhs: GlossaryTerm, rhs: GlossaryTerm) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}
