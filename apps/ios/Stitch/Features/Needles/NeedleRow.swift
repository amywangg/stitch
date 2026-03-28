import SwiftUI

// MARK: - Needle Row View

struct NeedleRowView: View {
    @Environment(ThemeManager.self) private var theme
    let needle: Needle

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: needleIcon(needle.type))
                .font(.title3)
                .foregroundStyle(theme.primary)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: 3) {
                Text(primaryLabel)
                    .font(.subheadline.weight(.medium))

                HStack(spacing: 8) {
                    if let material = needle.material {
                        Text(material.replacingOccurrences(of: "_", with: " ").capitalized)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    if let brand = needle.brand {
                        Text(brand)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    if let lengthText = lengthLabel {
                        Text(lengthText)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer()

            if needle.ravelryId != nil {
                Text("R")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 5)
                    .padding(.vertical, 2)
                    .background(theme.primary, in: RoundedRectangle(cornerRadius: 4))
            }
        }
        .padding(.vertical, 2)
    }

    // MARK: - Labels

    /// Primary label: cables show "Cable", needles show "US X / Ymm"
    private var primaryLabel: String {
        if needle.type == "interchangeable_cable" {
            if let length = needle.lengthCm {
                let inches = Double(length) / 2.54
                return "Cable \(length)cm / \(String(format: "%.0f", inches))″"
            }
            return "Cable"
        }

        // For needles/hooks: show US size + mm
        var parts: [String] = []
        if let sizeLabel = needle.sizeLabel, !sizeLabel.isEmpty {
            parts.append(sizeLabel)
        }
        let mm = needle.sizeMm
        if mm > 0 {
            let mmStr = mm.truncatingRemainder(dividingBy: 1) == 0
                ? String(format: "%.0fmm", mm)
                : String(format: "%.1fmm", mm)
            // Avoid duplicating if sizeLabel already contains the mm value
            if parts.isEmpty || !parts[0].contains("mm") {
                parts.append(mmStr)
            }
        }
        return parts.isEmpty ? "Unknown" : parts.joined(separator: " / ")
    }

    /// Length label in both cm and inches (for non-cable items)
    private var lengthLabel: String? {
        // Cables show length in primaryLabel
        if needle.type == "interchangeable_cable" { return nil }
        guard let length = needle.lengthCm else { return nil }
        let inches = Double(length) / 2.54
        return "\(length)cm / \(String(format: "%.0f", inches))″"
    }

    private func needleIcon(_ type: String) -> String {
        switch type {
        case "circular": return "arrow.triangle.capsulepath"
        case "dpn": return "line.3.horizontal"
        case "crochet_hook": return "pencil.and.outline"
        case "interchangeable_tip": return "arrow.left.arrow.right"
        case "interchangeable_cable": return "cable.connector"
        default: return "line.diagonal"
        }
    }
}

// MARK: - Needle Grid Cell

struct NeedleGridCell: View {
    @Environment(ThemeManager.self) private var theme
    let needle: Needle

    private func needleIcon(_ type: String) -> String {
        switch type {
        case "circular": return "arrow.triangle.capsulepath"
        case "dpn": return "line.3.horizontal"
        case "crochet_hook": return "pencil.and.outline"
        case "interchangeable_tip": return "arrow.left.arrow.right"
        case "interchangeable_cable": return "cable.connector"
        default: return "line.diagonal"
        }
    }

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: needleIcon(needle.type))
                .font(.title2)
                .foregroundStyle(theme.primary)
                .frame(height: 40)

            VStack(spacing: 2) {
                if needle.type == "interchangeable_cable" {
                    if let length = needle.lengthCm {
                        let inches = Double(length) / 2.54
                        Text("Cable \(length)cm / \(String(format: "%.0f", inches))″")
                            .font(.caption.weight(.medium))
                            .multilineTextAlignment(.center)
                    } else {
                        Text("Cable")
                            .font(.caption.weight(.medium))
                    }
                } else {
                    Text(needleSizeLabel)
                        .font(.caption.weight(.medium))
                        .multilineTextAlignment(.center)
                }
                if let material = needle.material {
                    Text(material.replacingOccurrences(of: "_", with: " ").capitalized)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(10)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var needleSizeLabel: String {
        var parts: [String] = []
        if let sizeLabel = needle.sizeLabel, !sizeLabel.isEmpty {
            parts.append(sizeLabel)
        }
        let mm = needle.sizeMm
        if mm > 0 {
            let mmStr = mm.truncatingRemainder(dividingBy: 1) == 0
                ? String(format: "%.0fmm", mm)
                : String(format: "%.1fmm", mm)
            if parts.isEmpty || !parts[0].contains("mm") {
                parts.append(mmStr)
            }
        }
        return parts.isEmpty ? "Unknown" : parts.joined(separator: " / ")
    }
}

// MARK: - Needle Set Grid Cell

struct NeedleSetGridCell: View {
    @Environment(ThemeManager.self) private var theme
    let group: NeedlesViewModel.NeedleGroup

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let imageUrl = group.imageUrl, !imageUrl.isEmpty,
               let url = URL(string: imageUrl) {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color(.systemGray5)
                }
                .frame(height: 100)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            } else {
                RoundedRectangle(cornerRadius: 8)
                    .fill(theme.primary.opacity(0.1))
                    .frame(height: 100)
                    .overlay {
                        Image(systemName: "rectangle.stack.fill")
                            .font(.title2)
                            .foregroundStyle(theme.primary.opacity(0.4))
                    }
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(group.title)
                    .font(.caption.weight(.semibold))
                    .lineLimit(2)
                if let subtitle = group.subtitle {
                    Text(subtitle)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Text("\(group.items.count) items")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(8)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
