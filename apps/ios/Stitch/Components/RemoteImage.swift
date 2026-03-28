import SwiftUI

// MARK: - RemoteImage

/// A remote image with rounded rectangle clipping and optional fixed aspect ratio.
/// Shows a gray placeholder while loading or when the URL is nil.
///
/// Usage:
/// ```swift
/// RemoteImage(url: pattern.coverImageUrl, cornerRadius: 10, aspectRatio: 2/3)
/// RemoteImage(url: item.photoUrl)
/// ```
struct RemoteImage: View {
    let url: String?
    var cornerRadius: CGFloat = 12
    var aspectRatio: CGFloat? = nil

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
            .maybeAspectRatio(aspectRatio)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
        } else {
            placeholder
                .maybeAspectRatio(aspectRatio)
                .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
        }
    }

    // MARK: - Placeholder

    private var placeholder: some View {
        ZStack {
            Color.gray.opacity(0.15)
            Image(systemName: "photo")
                .font(.title3)
                .foregroundStyle(.quaternary)
        }
    }
}

// MARK: - Conditional Aspect Ratio

private extension View {
    @ViewBuilder
    func maybeAspectRatio(_ ratio: CGFloat?) -> some View {
        if let ratio {
            self.aspectRatio(ratio, contentMode: .fit)
        } else {
            self
        }
    }
}
