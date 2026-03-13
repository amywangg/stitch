import SwiftUI
import RevenueCatUI

/// Shows an upsell overlay for features that require Pro.
/// Tapping "Upgrade to Pro" presents the RevenueCat paywall sheet.
struct ProGateBanner: View {
    let featureName: String
    @Environment(SubscriptionManager.self) private var subscriptions
    @Environment(ThemeManager.self) private var theme
    @State private var showPaywall = false

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "crown.fill")
                .font(.largeTitle)
                .foregroundStyle(theme.primary)

            Text("Stitch Pro")
                .font(.title2.bold())

            Text("\(featureName) is a Pro feature. Upgrade to unlock unlimited access.")
                .font(.body)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal)

            Button {
                showPaywall = true
            } label: {
                Text("Upgrade to Pro")
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
            PaywallView()
                .onPurchaseCompleted { _ in
                    showPaywall = false
                }
                .onRestoreCompleted { _ in
                    showPaywall = false
                }
        }
    }
}
