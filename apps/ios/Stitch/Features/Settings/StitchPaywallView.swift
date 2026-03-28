import SwiftUI
import RevenueCat

// MARK: - Paywall View

struct StitchPaywallView: View {
    @Environment(SubscriptionManager.self) private var subscriptions
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss

    @State private var selectedTier: PaywallTier = .pro
    @State private var billingPeriod: BillingPeriod = .yearly
    @State private var offerings: Offerings?
    @State private var isLoading = true
    @State private var isPurchasing = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 28) {
                    heroSection
                    tierPicker
                    featureList
                    pricingCards
                    purchaseButton
                    restoreButton
                    legalText
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 24)
            }
            .background(Color(.systemGroupedBackground))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title3)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .task { await loadOfferings() }
            .errorAlert(error: $error)
            .overlay {
                if isPurchasing {
                    purchasingOverlay
                }
            }
        }
    }

    // MARK: - Hero

    private var heroSection: some View {
        VStack(spacing: 12) {
            Image(systemName: "sparkles")
                .font(.system(size: 44))
                .foregroundStyle(theme.primary)

            Text("Upgrade your craft")
                .font(.title.weight(.bold))

            Text("More projects, smarter tools, seamless sync")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, 8)
    }

    // MARK: - Tier Picker

    private var tierPicker: some View {
        HStack(spacing: 0) {
            tierTab(.plus, label: "Plus")
            tierTab(.pro, label: "Pro")
        }
        .background(Color(.systemGray5), in: RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal, 40)
    }

    private func tierTab(_ tier: PaywallTier, label: String) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) { selectedTier = tier }
        } label: {
            Text(label)
                .font(.subheadline.weight(.semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(
                    selectedTier == tier
                        ? theme.primary
                        : Color.clear,
                    in: RoundedRectangle(cornerRadius: 10)
                )
                .foregroundStyle(selectedTier == tier ? .white : .primary)
        }
        .buttonStyle(.plain)
        .padding(2)
    }

    // MARK: - Feature List

    private var featureList: some View {
        VStack(spacing: 0) {
            ForEach(features, id: \.title) { feature in
                featureRow(feature)
                if feature.title != features.last?.title {
                    Divider().padding(.leading, 44)
                }
            }
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
    }

    private func featureRow(_ feature: PaywallFeature) -> some View {
        HStack(spacing: 14) {
            Image(systemName: feature.icon)
                .font(.body.weight(.medium))
                .foregroundStyle(feature.tint)
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 2) {
                Text(feature.title)
                    .font(.subheadline.weight(.medium))
                Text(feature.subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if feature.requiredTier <= selectedTier {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(Color(hex: "#4ECDC4"))
            } else {
                Image(systemName: "minus.circle")
                    .foregroundStyle(.quaternary)
            }
        }
        .padding(.vertical, 10)
        .contentShape(Rectangle())
    }

    // MARK: - Pricing Cards

    private var pricingCards: some View {
        HStack(spacing: 12) {
            pricingCard(
                period: .yearly,
                price: selectedTier == .pro ? "$34.99/yr" : "$14.99/yr",
                perMonth: selectedTier == .pro ? "$2.92/mo" : "$1.25/mo",
                savingsPercent: selectedTier == .pro ? 42 : 37
            )
            pricingCard(
                period: .monthly,
                price: selectedTier == .pro ? "$4.99/mo" : "$1.99/mo",
                perMonth: nil,
                savingsPercent: nil
            )
        }
    }

    private func pricingCard(
        period: BillingPeriod,
        price: String,
        perMonth: String?,
        savingsPercent: Int?
    ) -> some View {
        let isSelected = billingPeriod == period

        return Button {
            withAnimation(.easeInOut(duration: 0.2)) { billingPeriod = period }
        } label: {
            VStack(spacing: 8) {
                if let pct = savingsPercent {
                    Text("Save \(pct)%")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color(hex: "#4ECDC4"), in: Capsule())
                } else {
                    // Spacer to align cards
                    Text(" ")
                        .font(.caption2.weight(.bold))
                        .padding(.vertical, 3)
                        .opacity(0)
                }

                Text(period == .yearly ? "Yearly" : "Monthly")
                    .font(.subheadline.weight(.semibold))

                Text(price)
                    .font(.title3.weight(.bold))

                if let monthly = perMonth {
                    Text(monthly)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                isSelected
                    ? Color(.secondarySystemGroupedBackground)
                    : Color.clear,
                in: RoundedRectangle(cornerRadius: 14)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(
                        isSelected ? theme.primary : Color(.separator),
                        lineWidth: isSelected ? 2 : 0.5
                    )
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Purchase Button

    private var purchaseButton: some View {
        Button {
            Task { await purchase() }
        } label: {
            HStack(spacing: 8) {
                if isLoading {
                    ProgressView()
                        .tint(.white)
                        .controlSize(.small)
                }
                Text(purchaseButtonTitle)
                    .font(.headline)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(theme.primary, in: RoundedRectangle(cornerRadius: 14))
            .foregroundStyle(.white)
        }
        .buttonStyle(.plain)
        .disabled(isLoading || isPurchasing)
    }

    private var purchaseButtonTitle: String {
        let tier = selectedTier == .pro ? "Pro" : "Plus"
        let period = billingPeriod == .yearly ? "yearly" : "monthly"
        return "Subscribe to \(tier) \(period)"
    }

    // MARK: - Restore

    private var restoreButton: some View {
        Button {
            Task { await restore() }
        } label: {
            Text("Restore purchases")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Legal

    private var legalText: some View {
        Text("Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless it is canceled at least 24 hours before the end of the current period.")
            .font(.caption2)
            .foregroundStyle(.tertiary)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 8)
    }

    // MARK: - Purchasing Overlay

    private var purchasingOverlay: some View {
        ZStack {
            Color.black.opacity(0.3)
                .ignoresSafeArea()
            VStack(spacing: 16) {
                ProgressView()
                    .tint(.white)
                    .controlSize(.large)
                Text("Processing...")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.white)
            }
            .padding(32)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20))
        }
    }

    // MARK: - Data Loading

    private func loadOfferings() async {
        defer { isLoading = false }
        do {
            offerings = try await Purchases.shared.offerings()
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Purchase Logic

    private func purchase() async {
        guard let offerings else {
            error = "No offerings available. Please try again."
            return
        }

        let offeringId = selectedTier == .pro ? "stitch_pro" : "stitch_plus"
        guard let offering = offerings.offering(identifier: offeringId)
                ?? offerings.current else {
            error = "Subscription not available. Please try again later."
            return
        }

        let packageId = billingPeriod == .yearly ? "$rc_annual" : "$rc_monthly"
        guard let package = offering.package(identifier: packageId)
                ?? offering.availablePackages.first else {
            error = "Package not found. Please try again later."
            return
        }

        isPurchasing = true
        defer { isPurchasing = false }

        do {
            let result = try await Purchases.shared.purchase(package: package)
            if !result.userCancelled {
                await subscriptions.refresh()
                dismiss()
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func restore() async {
        isPurchasing = true
        defer { isPurchasing = false }
        do {
            try await subscriptions.restorePurchases()
            if subscriptions.tier != .free {
                dismiss()
            }
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - Supporting Types

private enum PaywallTier: Comparable {
    case plus, pro

    static func < (lhs: PaywallTier, rhs: PaywallTier) -> Bool {
        switch (lhs, rhs) {
        case (.plus, .pro): return true
        default: return false
        }
    }
}

private enum BillingPeriod {
    case monthly, yearly
}

private struct PaywallFeature {
    let icon: String
    let tint: Color
    let title: String
    let subtitle: String
    let requiredTier: PaywallTier
}

// MARK: - Feature Data

private let features: [PaywallFeature] = [
    PaywallFeature(
        icon: "folder",
        tint: Color(hex: "#FF6B6B"),
        title: "Unlimited projects",
        subtitle: "No more 3-project cap",
        requiredTier: .plus
    ),
    PaywallFeature(
        icon: "bookmark",
        tint: Color(hex: "#FF6B6B"),
        title: "Unlimited saved patterns",
        subtitle: "Save as many as you like",
        requiredTier: .plus
    ),
    PaywallFeature(
        icon: "arrow.triangle.2.circlepath",
        tint: Color(hex: "#4ECDC4"),
        title: "Cross-device sync",
        subtitle: "Row counter syncs between devices",
        requiredTier: .plus
    ),
    PaywallFeature(
        icon: "doc.text.viewfinder",
        tint: Color(hex: "#4ECDC4"),
        title: "More PDF parsing",
        subtitle: "Plus: 5/month, Pro: unlimited",
        requiredTier: .plus
    ),
    PaywallFeature(
        icon: "sparkles",
        tint: Color(hex: "#FF6B6B"),
        title: "AI pattern builder",
        subtitle: "Generate patterns with polished instructions",
        requiredTier: .pro
    ),
    PaywallFeature(
        icon: "arrow.left.arrow.right",
        tint: Color(hex: "#4ECDC4"),
        title: "AI yarn substitution",
        subtitle: "Smart alternatives from your stash",
        requiredTier: .pro
    ),
    PaywallFeature(
        icon: "ruler",
        tint: Color(hex: "#FF6B6B"),
        title: "AI size recommendations",
        subtitle: "Best size based on your measurements",
        requiredTier: .pro
    ),
    PaywallFeature(
        icon: "clock",
        tint: Color(hex: "#4ECDC4"),
        title: "Time estimates",
        subtitle: "Know when you will finish",
        requiredTier: .pro
    ),
    PaywallFeature(
        icon: "arrow.triangle.2.circlepath.circle",
        tint: Color(hex: "#FF6B6B"),
        title: "Ravelry auto-sync",
        subtitle: "Stash, queue, and projects stay in sync",
        requiredTier: .pro
    ),
]
