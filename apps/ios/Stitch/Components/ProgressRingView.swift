import SwiftUI

/// Circular progress ring with a center content slot.
/// Configurable color, line width, and size.
struct ProgressRingView<Content: View>: View {
    let progress: Double
    var color: Color = Color(hex: "#FF6B6B")
    var trackColor: Color = Color.gray.opacity(0.2)
    var lineWidth: CGFloat = 8
    var size: CGFloat = 200
    @ViewBuilder var center: () -> Content

    var body: some View {
        ZStack {
            // Track
            Circle()
                .stroke(trackColor, lineWidth: lineWidth)

            // Progress arc
            Circle()
                .trim(from: 0, to: min(progress, 1.0))
                .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut(duration: 0.3), value: progress)

            // Center content
            center()
        }
        .frame(width: size, height: size)
    }
}

/// Convenience initializer when no center content is needed.
extension ProgressRingView where Content == EmptyView {
    init(progress: Double, color: Color = Color(hex: "#FF6B6B"), lineWidth: CGFloat = 8, size: CGFloat = 200) {
        self.progress = progress
        self.color = color
        self.trackColor = Color.gray.opacity(0.2)
        self.lineWidth = lineWidth
        self.size = size
        self.center = { EmptyView() }
    }
}
