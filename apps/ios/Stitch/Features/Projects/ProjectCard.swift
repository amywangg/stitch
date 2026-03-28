import SwiftUI

// MARK: - Shared Helpers

func projectProgress(_ project: Project) -> Double? {
    guard let sections = project.sections, !sections.isEmpty else { return nil }
    let totalTarget = sections.compactMap(\.targetRows).reduce(0, +)
    guard totalTarget > 0 else { return nil }
    let totalCurrent = sections.map(\.currentRow).reduce(0, +)
    return min(Double(totalCurrent) / Double(totalTarget), 1.0)
}

func projectStatusColor(_ status: String) -> Color {
    switch status {
    case "active": return Color(hex: "#4ECDC4")
    case "completed": return .green
    case "frogged": return .orange
    case "hibernating": return .purple
    case "queued": return Color(hex: "#FF6B6B")
    default: return .secondary
    }
}

// MARK: - Shared Components

struct ProjectRavelryBadge: View {
    @Environment(ThemeManager.self) private var theme
    var body: some View {
        Text("R")
            .font(.system(size: 9, weight: .bold))
            .foregroundStyle(.white)
            .padding(.horizontal, 4)
            .padding(.vertical, 1)
            .background(theme.primary, in: RoundedRectangle(cornerRadius: 3))
    }
}

struct ProjectStatusDot: View {
    @Environment(ThemeManager.self) private var theme
    let status: String
    var body: some View {
        Circle()
            .fill(projectStatusColor(status))
            .frame(width: 6, height: 6)
    }
}

struct CircularProgress: View {
    let value: Double
    @Environment(ThemeManager.self) private var theme
    var body: some View {
        ZStack {
            Circle()
                .stroke(Color(.systemGray5), lineWidth: 3)
            Circle()
                .trim(from: 0, to: value)
                .stroke(theme.primary, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text("\(Int(value * 100))")
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(.secondary)
        }
    }
}

struct ProjectTagChips: View {
    @Environment(ThemeManager.self) private var theme
    let tags: [ProjectTag]
    var limit: Int = 3
    var style: TagStyle = .normal

    enum TagStyle {
        case normal
        case onImage
    }

    var body: some View {
        HStack(spacing: 4) {
            ForEach(Array(tags.prefix(limit))) { tag in
                Text(tag.tag.name)
                    .font(.system(size: 10, weight: .medium))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(chipBackground)
                    .foregroundStyle(chipForeground)
                    .clipShape(Capsule())
            }
            if tags.count > limit {
                Text("+\(tags.count - limit)")
                    .font(.system(size: 10, weight: .medium))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(chipBackground)
                    .foregroundStyle(chipForeground)
                    .clipShape(Capsule())
            }
        }
    }

    private var chipBackground: some ShapeStyle {
        switch style {
        case .normal:
            return AnyShapeStyle(Color(.systemGray5))
        case .onImage:
            return AnyShapeStyle(Color.white.opacity(0.2))
        }
    }

    private var chipForeground: some ShapeStyle {
        switch style {
        case .normal:
            return AnyShapeStyle(Color.secondary)
        case .onImage:
            return AnyShapeStyle(Color.white.opacity(0.9))
        }
    }
}

// MARK: - Grid Card (Spotify-style)

struct ProjectGridCard: View {
    let project: Project

    @Environment(ThemeManager.self) private var theme
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            coverImage
            textContent
        }
    }

    private var coverImage: some View {
        Color.clear
            .aspectRatio(1, contentMode: .fit)
            .overlay {
                if let photoURL = project.coverImageUrl, let url = URL(string: photoURL) {
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
    }

    private var gridPlaceholder: some View {
        ZStack {
            Color(.systemGray5)
            Image(systemName: "photo")
                .font(.system(size: 28))
                .foregroundStyle(.quaternary)
        }
    }

    private var textContent: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 5) {
                Text(project.title)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
                    .foregroundStyle(.primary)

                if project.ravelryId != nil {
                    ProjectRavelryBadge()
                }
            }

            HStack(spacing: 6) {
                ProjectStatusDot(status: project.status)
                Text(project.status.replacingOccurrences(of: "_", with: " ").capitalized)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 4) {
                if project.pdfUploadId != nil {
                    Label("PDF", systemImage: "doc.fill")
                        .font(.caption2)
                        .foregroundStyle(.green)
                }
                if project.pattern?.aiParsed == true {
                    Label("Parsed", systemImage: "sparkles")
                        .font(.caption2)
                        .foregroundStyle(.purple)
                }
            }

            if let tags = project.tags, !tags.isEmpty {
                ProjectTagChips(tags: tags, limit: 2)
            }

            if let progress = projectProgress(project) {
                ProgressView(value: progress)
                    .tint(theme.primary)
                    .scaleEffect(y: 0.6)
                    .padding(.top, 2)
            }
        }
    }
}

// MARK: - List Row (Compact)

struct ProjectListRow: View {
    @Environment(ThemeManager.self) private var theme
    let project: Project

    var body: some View {
        HStack(spacing: 12) {
            thumbnail
            titleAndMeta
            Spacer(minLength: 0)
            if let progress = projectProgress(project) {
                CircularProgress(value: progress)
                    .frame(width: 28, height: 28)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }

    private var thumbnail: some View {
        Color.clear
            .frame(width: 52, height: 52)
            .overlay {
                if let photoURL = project.coverImageUrl, let url = URL(string: photoURL) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            listPlaceholder
                        }
                    }
                } else {
                    listPlaceholder
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var listPlaceholder: some View {
        ZStack {
            Color(.systemGray5)
            Image(systemName: "photo")
                .font(.system(size: 16))
                .foregroundStyle(.quaternary)
        }
    }

    private var titleAndMeta: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(project.title)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)
                    .foregroundStyle(.primary)
                if project.ravelryId != nil {
                    ProjectRavelryBadge()
                }
            }
            HStack(spacing: 4) {
                ProjectStatusDot(status: project.status)
                Text(project.status.replacingOccurrences(of: "_", with: " ").capitalized)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text("·")
                    .font(.caption)
                    .foregroundStyle(.quaternary)
                Text(project.craftType.capitalized)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if project.pdfUploadId != nil {
                    Label("PDF", systemImage: "doc.fill")
                        .font(.caption2)
                        .foregroundStyle(.green)
                }
                if project.pattern?.aiParsed == true {
                    Label("Parsed", systemImage: "sparkles")
                        .font(.caption2)
                        .foregroundStyle(.purple)
                }
            }
            if let tags = project.tags, !tags.isEmpty {
                ProjectTagChips(tags: tags, limit: 3)
            }
        }
    }
}

// MARK: - Large Card (Editorial)

struct ProjectLargeCard: View {
    let project: Project

    @Environment(ThemeManager.self) private var theme
    var body: some View {
        ZStack(alignment: .bottomLeading) {
            heroImage
            gradient
            cardOverlay
        }
        .frame(maxWidth: .infinity)
        .frame(height: 240)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var heroImage: some View {
        Color(.systemGray5)
            .overlay {
                if let photoURL = project.coverImageUrl, let url = URL(string: photoURL) {
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
            Image(systemName: "photo")
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
                statusPill
                if project.ravelryId != nil {
                    Text("R")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.white.opacity(0.9))
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(.white.opacity(0.2), in: RoundedRectangle(cornerRadius: 4))
                }
                if project.pdfUploadId != nil {
                    Label("PDF", systemImage: "doc.fill")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(.green.opacity(0.6), in: RoundedRectangle(cornerRadius: 6))
                        .foregroundStyle(.white)
                }
                if project.pattern?.aiParsed == true {
                    Label("Parsed", systemImage: "sparkles")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(.purple.opacity(0.5), in: RoundedRectangle(cornerRadius: 6))
                        .foregroundStyle(.white)
                }
            }

            Text(project.title)
                .font(.title3.weight(.bold))
                .foregroundStyle(.white)
                .lineLimit(2)

            HStack(spacing: 8) {
                Text(project.craftType.capitalized)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.75))
                if let yarn = project.yarns?.first?.yarn {
                    Text("·")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.5))
                    Text(yarn.name)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.75))
                        .lineLimit(1)
                }
            }

            if let tags = project.tags, !tags.isEmpty {
                ProjectTagChips(tags: tags, limit: 3, style: .onImage)
            }

            if let progress = projectProgress(project) {
                ProgressView(value: progress)
                    .tint(theme.primary)
                    .background(Color.white.opacity(0.2), in: Capsule())
            }
        }
        .padding(16)
    }

    private var statusPill: some View {
        Text(project.status.replacingOccurrences(of: "_", with: " ").capitalized)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(projectStatusColor(project.status).opacity(0.85))
            .foregroundStyle(.white)
            .clipShape(Capsule())
    }
}

// MARK: - Queue Grid Card

struct QueueGridCard: View {
    let item: QueueItem
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            coverImage
            textContent
        }
    }

    private var coverImage: some View {
        Color.clear
            .aspectRatio(1, contentMode: .fit)
            .overlay {
                if let coverUrl = item.pattern?.coverImageUrl, let url = URL(string: coverUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            placeholder
                        }
                    }
                } else {
                    placeholder
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var placeholder: some View {
        ZStack {
            Color(.systemGray5)
            Image(systemName: "book.closed")
                .font(.system(size: 28))
                .foregroundStyle(.quaternary)
        }
    }

    private var textContent: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 5) {
                Text(item.pattern?.title ?? "Unknown pattern")
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
                    .foregroundStyle(.primary)
                if item.ravelryQueueId != nil {
                    ProjectRavelryBadge()
                }
            }
            HStack(spacing: 6) {
                ProjectStatusDot(status: "queued")
                Text("Queued")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            if let designer = item.pattern?.designerName {
                Text(designer)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
    }
}

// MARK: - Queue List Row

struct QueueListRow: View {
    let item: QueueItem
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        HStack(spacing: 12) {
            thumbnail
            titleAndMeta
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }

    private var thumbnail: some View {
        Color.clear
            .frame(width: 52, height: 52)
            .overlay {
                if let coverUrl = item.pattern?.coverImageUrl, let url = URL(string: coverUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            placeholder
                        }
                    }
                } else {
                    placeholder
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var placeholder: some View {
        ZStack {
            Color(.systemGray5)
            Image(systemName: "book.closed")
                .font(.system(size: 16))
                .foregroundStyle(.quaternary)
        }
    }

    private var titleAndMeta: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(item.pattern?.title ?? "Unknown pattern")
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)
                    .foregroundStyle(.primary)
                if item.ravelryQueueId != nil {
                    ProjectRavelryBadge()
                }
            }
            HStack(spacing: 4) {
                ProjectStatusDot(status: "queued")
                Text("Queued")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if let craft = item.pattern?.craftType {
                    Text("·")
                        .font(.caption)
                        .foregroundStyle(.quaternary)
                    Text(craft.capitalized)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            if let designer = item.pattern?.designerName {
                Text(designer)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
    }
}

// MARK: - Queue Large Card

struct QueueLargeCard: View {
    let item: QueueItem
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            heroImage
            gradient
            cardOverlay
        }
        .frame(maxWidth: .infinity)
        .frame(height: 240)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var heroImage: some View {
        Color(.systemGray5)
            .overlay {
                if let coverUrl = item.pattern?.coverImageUrl, let url = URL(string: coverUrl) {
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
                Text("Queued")
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(projectStatusColor("queued").opacity(0.85))
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
                if item.ravelryQueueId != nil {
                    Text("R")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.white.opacity(0.9))
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(.white.opacity(0.2), in: RoundedRectangle(cornerRadius: 4))
                }
            }

            Text(item.pattern?.title ?? "Unknown pattern")
                .font(.title3.weight(.bold))
                .foregroundStyle(.white)
                .lineLimit(2)

            HStack(spacing: 8) {
                if let craft = item.pattern?.craftType {
                    Text(craft.capitalized)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.75))
                }
                if let designer = item.pattern?.designerName {
                    Text("·")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.5))
                    Text(designer)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.75))
                        .lineLimit(1)
                }
            }
        }
        .padding(16)
    }
}
