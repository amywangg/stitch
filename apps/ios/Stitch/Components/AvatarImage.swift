import SwiftUI

// MARK: - AvatarImage

/// A circular avatar image loaded from a remote URL.
/// Shows a gray person placeholder when the URL is nil or while loading.
///
/// Usage:
/// ```swift
/// AvatarImage(url: user.avatarUrl)
/// AvatarImage(url: user.avatarUrl, size: 48)
/// ```
struct AvatarImage: View {
    let url: String?
    var size: CGFloat = 36

    var body: some View {
        if let urlString = url, let imageUrl = URL(string: urlString) {
            AsyncImage(url: imageUrl) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                default:
                    placeholder
                }
            }
            .frame(width: size, height: size)
            .clipShape(Circle())
        } else {
            placeholder
                .frame(width: size, height: size)
                .clipShape(Circle())
        }
    }

    // MARK: - Placeholder

    private var placeholder: some View {
        ZStack {
            Color.gray.opacity(0.15)
            Image(systemName: "person.fill")
                .font(.system(size: size * 0.4))
                .foregroundStyle(.quaternary)
        }
    }
}
