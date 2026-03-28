import SwiftUI

/// Full-screen cast-on counting mode.
/// Shows a large counter that increments with each voice count or tap.
/// Voice-activated: just count out loud ("one", "two", "three"...)
/// or say "plus one" / tap the screen.
struct CastOnModeView: View {
    var voiceManager: VoiceCounterManager
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss
    @State private var count: Int = 0
    @State private var isListening = false
    @State private var feedback: String?

    var body: some View {
        ZStack {
            // Background — tappable to increment
            Color(.systemBackground)
                .ignoresSafeArea()
                .onTapGesture {
                    incrementCount()
                }

            VStack(spacing: 24) {
                // Header
                HStack {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title2)
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)

                    Spacer()

                    Text("Cast on")
                        .font(.headline)

                    Spacer()

                    // Mic toggle
                    Button {
                        Task {
                            if isListening {
                                voiceManager.stopListening()
                                isListening = false
                            } else {
                                await voiceManager.startListening()
                                isListening = true
                            }
                        }
                    } label: {
                        Image(systemName: isListening ? "mic.fill" : "mic")
                            .font(.title2)
                            .foregroundStyle(isListening ? theme.primary : .secondary)
                            .symbolEffect(.pulse, isActive: isListening)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)

                Spacer()

                // Large count display
                Text("\(count)")
                    .font(.system(size: 120, weight: .bold, design: .rounded))
                    .foregroundStyle(theme.primary)
                    .contentTransition(.numericText())
                    .animation(.spring(response: 0.3), value: count)

                Text("stitches cast on")
                    .font(.title3)
                    .foregroundStyle(.secondary)

                Spacer()

                // Controls
                HStack(spacing: 40) {
                    // Decrement
                    Button {
                        if count > 0 {
                            count -= 1
                        }
                    } label: {
                        Image(systemName: "minus")
                            .font(.title2.bold())
                            .frame(width: 64, height: 64)
                            .background(theme.primary.opacity(0.12))
                            .foregroundStyle(theme.primary)
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)

                    // Increment
                    Button {
                        incrementCount()
                    } label: {
                        Image(systemName: "plus")
                            .font(.title.bold())
                            .frame(width: 80, height: 80)
                            .background(theme.primary)
                            .foregroundStyle(.white)
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                }

                // Hint
                Text("Tap anywhere, press +, or say \"plus one\"")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                    .padding(.bottom, 32)
            }

            // Voice feedback toast
            if let feedback {
                VStack {
                    Text(feedback)
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(.black.opacity(0.7), in: Capsule())
                        .padding(.top, 80)
                    Spacer()
                }
                .transition(.opacity)
            }
        }
        .onAppear {
            // Wire voice commands for cast-on mode
            voiceManager.onCommand = { command in
                Task { @MainActor in
                    switch command {
                    case .increment:
                        incrementCount()
                    case .decrement:
                        if count > 0 { count -= 1 }
                    case .undo:
                        if count > 0 { count -= 1 }
                    case .queryStatus:
                        voiceManager.speak("\(count) stitches cast on")
                        showFeedback("\(count) stitches")
                    default:
                        break
                    }
                }
            }
        }
        .onDisappear {
            if isListening {
                voiceManager.stopListening()
            }
            // Voice command handler will be re-wired by CounterView's .task
        }
    }

    private func incrementCount() {
        count += 1
        showFeedback("\(count)")

        // Light haptic
        #if canImport(UIKit)
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        #endif
    }

    private func showFeedback(_ text: String) {
        withAnimation { feedback = text }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            withAnimation { feedback = nil }
        }
    }
}
