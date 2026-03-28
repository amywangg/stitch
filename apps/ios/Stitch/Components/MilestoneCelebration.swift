import SwiftUI

#if canImport(UIKit)
import UIKit
#endif

/// Milestone thresholds that trigger celebrations.
private let milestoneRows: Set<Int> = [50, 100, 250, 500, 1000]

/// Returns true if the given row count is a milestone.
func isMilestoneRow(_ row: Int) -> Bool {
    milestoneRows.contains(row)
}

/// Confetti/particle overlay that plays at row milestones.
/// Shows for 1.5 seconds with heavy haptic feedback.
struct MilestoneCelebration: View {
    let row: Int
    @State private var isAnimating = false
    @State private var particles: [Particle] = []

    var body: some View {
        ZStack {
            // Semi-transparent backdrop
            Color.black.opacity(isAnimating ? 0.2 : 0)
                .ignoresSafeArea()
                .allowsHitTesting(false)

            // Particles
            ForEach(particles) { particle in
                Circle()
                    .fill(particle.color)
                    .frame(width: particle.size, height: particle.size)
                    .offset(x: isAnimating ? particle.endX : 0, y: isAnimating ? particle.endY : 0)
                    .opacity(isAnimating ? 0 : 1)
                    .scaleEffect(isAnimating ? 0.3 : 1)
            }

            // Milestone badge
            VStack(spacing: 8) {
                Image(systemName: "star.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(.yellow)
                    .scaleEffect(isAnimating ? 1.2 : 0.5)

                Text("Row \(row)!")
                    .font(.title.weight(.bold))
                    .foregroundStyle(.white)

                Text(milestoneMessage(for: row))
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.8))
            }
            .scaleEffect(isAnimating ? 1 : 0.3)
            .opacity(isAnimating ? 1 : 0)
        }
        .onAppear {
            particles = generateParticles()
            UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
            withAnimation(.spring(response: 0.5, dampingFraction: 0.6)) {
                isAnimating = true
            }
            // Auto-dismiss after 1.5 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                withAnimation(.easeOut(duration: 0.3)) {
                    isAnimating = false
                }
            }
        }
    }

    private func milestoneMessage(for row: Int) -> String {
        switch row {
        case 50: return "Great start"
        case 100: return "Triple digits"
        case 250: return "Impressive progress"
        case 500: return "Halfway to a thousand"
        case 1000: return "Legendary"
        default: return "Keep going"
        }
    }

    private func generateParticles() -> [Particle] {
        let colors: [Color] = [
            Color(hex: "#FF6B6B"), Color(hex: "#4ECDC4"),
            .yellow, .purple, .orange, .pink
        ]
        return (0..<24).map { i in
            let angle = Double(i) * (360.0 / 24.0) * .pi / 180
            let distance = Double.random(in: 80...200)
            return Particle(
                id: i,
                color: colors[i % colors.count],
                size: CGFloat.random(in: 4...10),
                endX: cos(angle) * distance,
                endY: sin(angle) * distance
            )
        }
    }
}

private struct Particle: Identifiable {
    let id: Int
    let color: Color
    let size: CGFloat
    let endX: Double
    let endY: Double
}
