import SwiftUI

// MARK: - Pattern Row (List Layout)

struct PatternRow: View {
    @Environment(ThemeManager.self) private var theme
    let pattern: Pattern

    private var hasPatternData: Bool {
        pattern.aiParsed == true || pattern.pdfUrl != nil || pattern.designerName != nil || pattern.difficulty != nil
    }

    var body: some View {
        HStack(spacing: 12) {
            patternCover
            patternInfo
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 6)
    }

    private var patternCover: some View {
        ZStack {
            if let coverUrl = pattern.coverImageUrl, let url = URL(string: coverUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    default:
                        patternCoverPlaceholder
                    }
                }
            } else {
                patternCoverPlaceholder
            }
        }
        .frame(width: 50, height: 70)
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    private var patternCoverPlaceholder: some View {
        ZStack {
            Color(.systemGray5)
            Image(systemName: "book.closed")
                .font(.system(size: 16))
                .foregroundStyle(.quaternary)
        }
    }

    private var patternInfo: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(pattern.title)
                .font(.subheadline.weight(.medium))
                .lineLimit(2)
                .foregroundStyle(.primary)

            if let designer = pattern.designerName {
                Text(designer)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 6) {
                if let difficulty = pattern.difficulty {
                    Text(difficulty.capitalized)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                if pattern.firstPdfUploadId != nil {
                    Label("PDF", systemImage: "doc.fill")
                        .font(.caption2)
                        .foregroundStyle(.green)
                }
                if pattern.aiParsed == true {
                    Label("Parsed", systemImage: "sparkles")
                        .font(.caption2)
                        .foregroundStyle(.purple)
                }
                if pattern.ravelryId != nil && !hasPatternData {
                    Label("Saved from Ravelry", systemImage: "arrow.down.circle")
                        .font(.caption2)
                        .foregroundStyle(.orange)
                }
            }
        }
    }
}

// MARK: - Pattern Grid Card

struct PatternGridCard: View {
    @Environment(ThemeManager.self) private var theme
    let pattern: Pattern

    private var hasPatternData: Bool {
        pattern.aiParsed == true || pattern.pdfUrl != nil || pattern.designerName != nil || pattern.difficulty != nil
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            coverImage
            textContent
        }
    }

    private var coverImage: some View {
        ZStack(alignment: .topTrailing) {
            Color(.systemGray5)
                .aspectRatio(2.0/3.0, contentMode: .fit)
                .overlay {
                    if let coverUrl = pattern.coverImageUrl, let url = URL(string: coverUrl) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable().aspectRatio(contentMode: .fill)
                            default:
                                gridPlaceholder
                            }
                        }
                    } else {
                        gridPlaceholder
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 10))

            if pattern.firstPdfUploadId != nil {
                Image(systemName: "doc.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(.white)
                    .padding(5)
                    .background(.green, in: RoundedRectangle(cornerRadius: 5))
                    .padding(6)
            } else if pattern.ravelryId != nil && !hasPatternData {
                Image(systemName: "arrow.down.circle.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(.orange)
                    .padding(6)
            }
        }
    }

    private var gridPlaceholder: some View {
        ZStack {
            Color(.systemGray5)
            Image(systemName: "book.closed")
                .font(.system(size: 28))
                .foregroundStyle(.quaternary)
        }
    }

    private var textContent: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(pattern.title)
                .font(.subheadline.weight(.semibold))
                .lineLimit(2)
                .foregroundStyle(.primary)

            if let designer = pattern.designerName {
                Text(designer)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            HStack(spacing: 6) {
                if let difficulty = pattern.difficulty {
                    Text(difficulty.capitalized)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                if pattern.firstPdfUploadId != nil {
                    Label("PDF", systemImage: "doc.fill")
                        .font(.caption2)
                        .foregroundStyle(.green)
                }
                if pattern.aiParsed == true {
                    Label("Parsed", systemImage: "sparkles")
                        .font(.caption2)
                        .foregroundStyle(.purple)
                } else if pattern.ravelryId != nil && !hasPatternData {
                    Text("No pattern data")
                        .font(.caption2)
                        .foregroundStyle(.orange)
                }
            }
        }
    }
}

// MARK: - Pattern Large Card (Editorial)

struct PatternLargeCard: View {
    let pattern: Pattern

    private var hasPatternData: Bool {
        pattern.aiParsed == true || pattern.pdfUrl != nil || pattern.designerName != nil || pattern.difficulty != nil
    }

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            heroImage
            gradient
            cardOverlay
        }
        .frame(maxWidth: .infinity)
        .frame(height: 260)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var heroImage: some View {
        Color(.systemGray5)
            .overlay {
                if let coverUrl = pattern.coverImageUrl, let url = URL(string: coverUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            largePlaceholder
                        }
                    }
                } else {
                    largePlaceholder
                }
            }
    }

    private var largePlaceholder: some View {
        ZStack {
            Color(.systemGray6)
            Image(systemName: "book.closed")
                .font(.system(size: 40))
                .foregroundStyle(.quaternary)
        }
    }

    private var gradient: some View {
        LinearGradient(
            colors: [.clear, .black.opacity(0.7)],
            startPoint: .top,
            endPoint: .bottom
        )
    }

    private var cardOverlay: some View {
        VStack(alignment: .leading, spacing: 6) {
            Spacer()

            HStack(spacing: 8) {
                if let difficulty = pattern.difficulty {
                    Text(difficulty.capitalized)
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(.white.opacity(0.2), in: RoundedRectangle(cornerRadius: 6))
                        .foregroundStyle(.white)
                }
                if pattern.firstPdfUploadId != nil {
                    Label("PDF", systemImage: "doc.fill")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(.green.opacity(0.6), in: RoundedRectangle(cornerRadius: 6))
                        .foregroundStyle(.white)
                }
                if pattern.aiParsed == true {
                    Label("Parsed", systemImage: "sparkles")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(.purple.opacity(0.5), in: RoundedRectangle(cornerRadius: 6))
                        .foregroundStyle(.white)
                }
                if pattern.ravelryId != nil && !hasPatternData {
                    Label("Saved from Ravelry", systemImage: "arrow.down.circle")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(.orange.opacity(0.7), in: RoundedRectangle(cornerRadius: 6))
                        .foregroundStyle(.white)
                }
            }

            Text(pattern.title)
                .font(.title3.weight(.bold))
                .foregroundStyle(.white)
                .lineLimit(2)

            if let designer = pattern.designerName {
                Text(designer)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.75))
            }

            HStack(spacing: 8) {
                Text((pattern.craftType ?? "knitting").capitalized)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.75))
                if let garment = pattern.garmentType {
                    Text("·")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.5))
                    Text(garment.capitalized)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.75))
                }
            }
        }
        .padding(16)
    }
}
