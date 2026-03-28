import SwiftUI

/// Shows an upsell overlay for features that require Pro.
/// Tapping "Upgrade" presents the custom Stitch paywall sheet.
struct ProGateBanner: View {
    let featureName: String
    var requiredTier: String = "Pro"
    @Environment(ThemeManager.self) private var theme
    @State private var showPaywall = false

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "crown.fill")
                .font(.largeTitle)
                .foregroundStyle(theme.primary)

            Text("Stitch \(requiredTier)")
                .font(.title2.bold())

            Text("\(featureName) requires \(requiredTier). Upgrade to unlock.")
                .font(.body)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal)

            Button {
                showPaywall = true
            } label: {
                Text("Upgrade to \(requiredTier)")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(theme.primary)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding(.horizontal)
        }
        .padding()
        .sheet(isPresented: $showPaywall) {
            StitchPaywallView()
        }
    }
}
