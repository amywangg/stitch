import SwiftUI

struct PostCard: View {
    let post: FeedPost
    let onLike: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Author row
            HStack(spacing: 8) {
                AsyncImage(url: URL(string: post.user.avatarUrl ?? "")) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Color.gray.opacity(0.3)
                }
                .frame(width: 36, height: 36)
                .clipShape(Circle())

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
                    .foregroundStyle(post.isLiked ? Color(hex: "#FF6B6B") : .secondary)
                }
                .buttonStyle(.plain)

                Label(
                    "\(post.count?.comments ?? 0)",
                    systemImage: "bubble.right"
                )
                .foregroundStyle(.secondary)

                Spacer()
            }
            .font(.subheadline)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
