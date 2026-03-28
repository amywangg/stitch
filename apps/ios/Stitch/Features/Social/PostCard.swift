import SwiftUI

struct PostCard: View {
    let post: FeedPost
    let onLike: () -> Void
    let onComment: () -> Void
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Author row
            HStack(spacing: 8) {
                AvatarImage(url: post.user.avatarUrl, size: 36)

                VStack(alignment: .leading, spacing: 2) {
                    Text(post.user.displayName ?? post.user.username)
                        .font(.subheadline.weight(.semibold))
                    Text(post.createdAt, style: .relative)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()
            }

            // Content
            Text(post.content)
                .font(.body)

            // Context tags (project, pattern, yarn, session)
            if post.project != nil || post.pattern != nil || post.yarns?.isEmpty == false || post.sessionMinutes != nil {
                postContextTags
            }

            // Photo carousel
            if let photos = post.photos, !photos.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(photos) { photo in
                            AsyncImage(url: URL(string: photo.url)) { image in
                                image.resizable().scaledToFill()
                            } placeholder: {
                                Color.gray.opacity(0.2)
                            }
                            .frame(width: photos.count == 1 ? .infinity : 240, height: 180)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }
                }
            }

            // Interaction bar
            HStack(spacing: 16) {
                Button(action: onLike) {
                    Label(
                        "\(post.count?.likes ?? 0)",
                        systemImage: post.isLiked ? "heart.fill" : "heart"
                    )
                    .foregroundStyle(post.isLiked ? theme.primary : .secondary)
                }
                .buttonStyle(.plain)

                Button(action: onComment) {
                    Label(
                        "\(post.count?.comments ?? 0)",
                        systemImage: "bubble.right"
                    )
                    .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)

                Spacer()
            }
            .font(.subheadline)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Context Tags

    private var postContextTags: some View {
        FlowLayout(spacing: 6) {
            if let project = post.project {
                contextPill(icon: "folder.fill", text: project.title, color: theme.primary)
            }
            if let pattern = post.pattern {
                contextPill(icon: "doc.text.fill", text: pattern.title, color: Color(hex: "#4ECDC4"))
            }
            if let yarns = post.yarns {
                ForEach(yarns) { yarn in
                    let label = yarn.colorway != nil ? "\(yarn.yarnName) — \(yarn.colorway!)" : yarn.yarnName
                    contextPill(icon: "tag.fill", text: label, color: .orange)
                }
            }
            if let mins = post.sessionMinutes, mins > 0 {
                let hrs = mins / 60
                let m = mins % 60
                let timeText = hrs > 0 ? "\(hrs)h \(m)m" : "\(m)m"
                let rowText = post.sessionRows.map { " · \($0) rows" } ?? ""
                contextPill(icon: "clock.fill", text: "\(timeText)\(rowText)", color: .purple)
            }
        }
    }

    private func contextPill(icon: String, text: String, color: Color) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 9))
            Text(text)
                .font(.caption2)
                .lineLimit(1)
        }
        .foregroundStyle(color)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(color.opacity(0.1), in: Capsule())
    }
}
