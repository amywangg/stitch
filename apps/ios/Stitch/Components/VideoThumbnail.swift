import SwiftUI

/// Shows a YouTube video thumbnail with a play button overlay.
/// Tapping opens the video in an in-app player sheet.
struct VideoThumbnail: View {
    let videoID: String
    var startSeconds: Int? = nil
    var endSeconds: Int? = nil
    var isShort: Bool = false
    var alternateIDs: [String] = []

    @State private var showPlayer = false

    var body: some View {
        Button {
            showPlayer = true
        } label: {
            thumbnailContent
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $showPlayer) {
            YouTubePlayerSheet(
                videoID: videoID,
                startSeconds: startSeconds,
                endSeconds: endSeconds,
                isShort: isShort
            )
        }
    }

    // MARK: - Thumbnail

    private var thumbnailContent: some View {
        ZStack {
            let url = YouTubeHelpers.thumbnailURL(videoID: videoID, quality: .medium)

            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(16.0 / 9.0, contentMode: .fit)
                case .failure:
                    fallbackThumbnail
                case .empty:
                    placeholder
                @unknown default:
                    placeholder
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 12))

            // Play button overlay
            Circle()
                .fill(.black.opacity(0.5))
                .frame(width: 52, height: 52)
                .overlay {
                    Image(systemName: "play.fill")
                        .font(.title3)
                        .foregroundStyle(.white)
                        .offset(x: 2)
                }
        }
    }

    private var placeholder: some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(Color(.secondarySystemGroupedBackground))
            .aspectRatio(16.0 / 9.0, contentMode: .fit)
            .overlay {
                ProgressView()
            }
    }

    private var fallbackThumbnail: some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(Color(.secondarySystemGroupedBackground))
            .aspectRatio(16.0 / 9.0, contentMode: .fit)
            .overlay {
                VStack(spacing: 6) {
                    Image(systemName: "play.rectangle.fill")
                        .font(.title)
                        .foregroundStyle(.secondary)
                    Text("Watch tutorial")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
    }
}
