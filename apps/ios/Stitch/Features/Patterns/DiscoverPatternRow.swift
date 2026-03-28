import SwiftUI

// MARK: - Discover Pattern Row

struct DiscoverPatternRow: View {
    @Environment(ThemeManager.self) private var theme
    let pattern: DiscoverPattern
    let isSaved: Bool
    let onSave: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            patternCover
            patternInfo
            Spacer(minLength: 0)
            saveButton
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }

    // MARK: - Cover

    private var patternCover: some View {
        Color.clear
            .frame(width: 56, height: 80)
            .overlay {
                if let photoUrl = pattern.photoUrl, let url = URL(string: photoUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            coverPlaceholder
                        }
                    }
                } else {
                    coverPlaceholder
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var coverPlaceholder: some View {
        ZStack {
            Color(.systemGray5)
            Image(systemName: "book.closed")
                .foregroundStyle(.quaternary)
        }
    }

    // MARK: - Info

    private var patternInfo: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(pattern.name)
                .font(.subheadline.weight(.medium))
                .lineLimit(2)
                .foregroundStyle(.primary)

            if let designer = pattern.designer {
                Text("by \(designer)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 6) {
                if pattern.free {
                    Text("Free")
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(theme.primary)
                }
                if let weight = pattern.weight {
                    Text(weight.capitalized)
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 1)
                        .background(Color(.systemGray5), in: RoundedRectangle(cornerRadius: 4))
                }
                if let difficulty = pattern.difficulty {
                    HStack(spacing: 2) {
                        Image(systemName: "chart.bar")
                            .font(.system(size: 9))
                        Text(String(format: "%.1f", difficulty))
                            .font(.caption2)
                    }
                    .foregroundStyle(.secondary)
                }
                if let rating = pattern.rating {
                    HStack(spacing: 2) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 9))
                            .foregroundStyle(theme.primary)
                        Text(String(format: "%.1f", rating))
                            .font(.caption2)
                    }
                }
            }

            if let gauge = pattern.gauge {
                Text(gauge)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .lineLimit(1)
            }
        }
    }

    // MARK: - Save Button

    private var saveButton: some View {
        Button {
            if !isSaved {
                onSave()
            }
        } label: {
            Image(systemName: isSaved ? "bookmark.fill" : "bookmark")
                .foregroundStyle(theme.primary)
                .font(.title3)
                .contentTransition(.symbolEffect(.replace))
        }
        .buttonStyle(.plain)
        .disabled(isSaved)
        .sensoryFeedback(.success, trigger: isSaved)
    }
}
