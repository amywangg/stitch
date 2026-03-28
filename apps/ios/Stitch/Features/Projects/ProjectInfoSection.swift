import SwiftUI

// MARK: - Photo Carousel

struct ProjectPhotoCarousel: View {
    let photos: [ProjectPhoto]
    @State private var fullScreenUrl: URL?

    var body: some View {
        TabView {
            ForEach(photos) { photo in
                AsyncImage(url: URL(string: photo.url)) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    case .failure:
                        Color(.systemGray5)
                            .overlay { Image(systemName: "photo").font(.largeTitle).foregroundStyle(.secondary) }
                    default:
                        Color(.systemGray6).overlay { ProgressView() }
                    }
                }
                .frame(height: 300)
                .clipped()
                .contentShape(Rectangle())
                .onTapGesture {
                    if let url = URL(string: photo.url) {
                        fullScreenUrl = url
                    }
                }
            }
        }
        .tabViewStyle(.page(indexDisplayMode: photos.count > 1 ? .always : .never))
        .frame(height: 300)
        .fullScreenCover(item: $fullScreenUrl) { url in
            FullScreenImageViewer(url: url)
        }
    }
}

extension URL: @retroactive Identifiable {
    public var id: String { absoluteString }
}

// MARK: - Header Badges

struct ProjectHeaderBadges: View {
    let project: Project
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        HStack(spacing: 8) {
            badge(project.status.capitalized, icon: statusIcon(project.status), color: statusColor(project.status))
            badge(project.craftType.capitalized, icon: "leaf", color: .secondary)
            if let category = project.category, !category.isEmpty {
                badge(category, icon: "tag", color: .secondary)
            }
            Spacer()
        }
    }

    private func badge(_ text: String, icon: String, color: Color) -> some View {
        Label(text, systemImage: icon)
            .font(.caption.weight(.medium))
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(color.opacity(0.12), in: Capsule())
    }

    private func statusIcon(_ status: String) -> String {
        switch status {
        case "completed": return "checkmark.circle.fill"
        case "hibernating": return "moon.fill"
        case "frogged": return "scissors"
        default: return "play.circle.fill"
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "completed": return .green
        case "hibernating": return .orange
        case "frogged": return .red
        default: return theme.primary
        }
    }
}

// MARK: - Pattern Card

struct ProjectPatternCard: View {
    let pattern: PatternRef
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        NavigationLink(value: Route.patternDetail(id: pattern.id)) {
            HStack(spacing: 12) {
                // Cover image thumbnail
                if let coverUrl = pattern.coverImageUrl, let url = URL(string: coverUrl) {
                    AsyncImage(url: url) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Color.secondary.opacity(0.1)
                    }
                    .frame(width: 56, height: 72)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                } else {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(theme.primary.opacity(0.1))
                        .frame(width: 56, height: 72)
                        .overlay {
                            Image(systemName: "book.closed")
                                .foregroundStyle(theme.primary)
                        }
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Pattern")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(pattern.title)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.primary)
                        .lineLimit(2)
                    if let designer = pattern.designerName {
                        Text("by \(designer)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    // Quick info chips
                    HStack(spacing: 6) {
                        if let weight = pattern.yarnWeight {
                            Text(weight)
                                .font(.caption2)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.secondary.opacity(0.08), in: Capsule())
                        }
                        if let difficulty = pattern.difficulty {
                            Text(difficulty)
                                .font(.caption2)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.secondary.opacity(0.08), in: Capsule())
                        }
                    }
                    .foregroundStyle(.secondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
            .padding(12)
            .background(Color.secondary.opacity(0.06), in: RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Quick Stats

struct ProjectQuickStats: View {
    let project: Project

    var body: some View {
        HStack(spacing: 0) {
            if let started = project.startedAt {
                statCell("Started", started.formatted(date: .abbreviated, time: .omitted))
            }
            if let finished = project.finishedAt, project.status == "completed" {
                statCell("Finished", finished.formatted(date: .abbreviated, time: .omitted))
            }
            if let size = project.sizeMade {
                statCell("Size", size)
            }
        }
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func statCell(_ label: String, _ value: String) -> some View {
        VStack(spacing: 4) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            Text(value).font(.subheadline.weight(.medium))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
    }
}

// MARK: - Tags Block

struct ProjectTagsBlock: View {
    let tags: [ProjectTag]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Tags").font(.headline)
            FlowLayout(spacing: 6) {
                ForEach(tags) { tag in
                    Text(tag.tag.name)
                        .font(.caption)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(Color.secondary.opacity(0.1), in: Capsule())
                        .foregroundStyle(.secondary)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
