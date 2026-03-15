import SwiftUI

/// Sheet wrapper for YouTubePlayerView with dismiss controls.
struct YouTubePlayerSheet: View {
    let videoID: String
    var startSeconds: Int? = nil
    var endSeconds: Int? = nil
    var isShort: Bool = false

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            YouTubePlayerView(
                videoID: videoID,
                startSeconds: startSeconds,
                isShort: isShort
            )
            .ignoresSafeArea()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title3)
                            .symbolRenderingMode(.palette)
                            .foregroundStyle(.white, .white.opacity(0.3))
                    }
                }
            }
            .toolbarBackground(.hidden, for: .navigationBar)
        }
        .presentationBackground(.black)
    }
}
