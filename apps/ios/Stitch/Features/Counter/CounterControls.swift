import SwiftUI

#if canImport(UIKit)
import UIKit
#endif

// MARK: - Haptic Button Style

/// Custom ButtonStyle that adds a press scale animation.
struct HapticScaleButtonStyle: ButtonStyle {
    let feedbackStyle: UIImpactFeedbackGenerator.FeedbackStyle

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.93 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, isPressed in
                if isPressed {
                    UIImpactFeedbackGenerator(style: feedbackStyle).impactOccurred()
                }
            }
    }
}

// MARK: - Counter Controls

struct CounterControls: View {
    let viewModel: CounterViewModel
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        HStack(spacing: 16) {
            Button {
                Task { await viewModel.decrement() }
            } label: {
                Image(systemName: "minus")
                    .font(.title2.bold())
                    .frame(width: 72, height: 72)
                    .background(theme.primary.opacity(0.12))
                    .foregroundStyle(theme.primary)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            }
            .buttonStyle(HapticScaleButtonStyle(feedbackStyle: .light))

            Button {
                Task { await viewModel.increment() }
            } label: {
                Image(systemName: "plus")
                    .font(.title.bold())
                    .frame(maxWidth: .infinity, minHeight: 72)
                    .background(theme.primary)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            }
            .buttonStyle(HapticScaleButtonStyle(feedbackStyle: .medium))
        }
    }
}

// MARK: - Section Complete Footer

struct CounterSectionCompleteFooter: View {
    let viewModel: CounterViewModel
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        VStack(spacing: 12) {
            if let next = viewModel.nextSection {
                Button {
                    Task { await viewModel.switchSection(next) }
                } label: {
                    HStack(spacing: 8) {
                        Text("Next: \(next.name)")
                            .font(.subheadline.weight(.semibold))
                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(theme.primary)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .buttonStyle(.plain)
            } else {
                HStack(spacing: 8) {
                    Image(systemName: "party.popper.fill")
                    Text("All sections done")
                        .font(.subheadline.weight(.medium))
                }
                .foregroundStyle(.green)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(.green.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }

            // Still let user go back if they need to
            Button {
                Task { await viewModel.decrement() }
            } label: {
                Text("Go back a row")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
            .padding(.bottom, 4)
        }
    }
}
