import Foundation
import RevenueCat

enum AppTier: String, Comparable {
    case free
    case plus
    case pro

    static func < (lhs: AppTier, rhs: AppTier) -> Bool {
        let order: [AppTier] = [.free, .plus, .pro]
        return (order.firstIndex(of: lhs) ?? 0) < (order.firstIndex(of: rhs) ?? 0)
    }
}

@Observable
final class SubscriptionManager {
    static let shared = SubscriptionManager()
    private init() {}

    var tier: AppTier = .pro  // Alpha: all users get Pro
    var customerInfo: CustomerInfo?

    /// Convenience — true if user is Plus or Pro
    var isPlusOrAbove: Bool { tier >= .plus }
    /// Convenience — true only for Pro tier
    var isPro: Bool { tier == .pro }

    // MARK: - Setup

    func configure() {
        Purchases.logLevel = .debug
        Purchases.configure(withAPIKey: AppConfig.revenueCatAPIKey)
    }

    /// Call after Clerk sign-in to associate the RevenueCat anonymous user with the Clerk user ID.
    func logIn(userId: String) async {
        do {
            let (info, _) = try await Purchases.shared.logIn(userId)
            updateState(from: info)
        } catch {
            print("[SubscriptionManager] logIn error: \(error.localizedDescription)")
        }
    }

    func logOut() async {
        do {
            let info = try await Purchases.shared.logOut()
            updateState(from: info)
        } catch {
            print("[SubscriptionManager] logOut error: \(error.localizedDescription)")
        }
    }

    // MARK: - Entitlement Check

    func refresh() async {
        do {
            let info = try await Purchases.shared.customerInfo()
            updateState(from: info)
        } catch {
            print("[SubscriptionManager] refresh error: \(error.localizedDescription)")
        }
    }

    // MARK: - Purchase

    func purchasePro() async throws {
        let offerings = try await Purchases.shared.offerings()
        guard let package = offerings.current?.availablePackages.first else {
            throw SubscriptionError.noOfferings
        }
        let result = try await Purchases.shared.purchase(package: package)
        updateState(from: result.customerInfo)
    }

    // MARK: - Restore

    func restorePurchases() async throws {
        let info = try await Purchases.shared.restorePurchases()
        updateState(from: info)
    }

    // MARK: - Listen for Updates

    /// Call from a long-lived task (e.g. .task on RootView) to keep tier in sync.
    func listenForUpdates() async {
        for await info in Purchases.shared.customerInfoStream {
            updateState(from: info)
        }
    }

    // MARK: - Private

    private func updateState(from info: CustomerInfo) {
        customerInfo = info
        // Check entitlements in order: Pro first, then Plus
        if info.entitlements["Stitch Pro"]?.isActive == true {
            tier = .pro
        } else if info.entitlements["Stitch Plus"]?.isActive == true {
            tier = .plus
        } else {
            tier = .free
        }
    }
}

enum SubscriptionError: LocalizedError {
    case noOfferings

    var errorDescription: String? {
        switch self {
        case .noOfferings:
            return "No subscription offerings available. Please try again later."
        }
    }
}
