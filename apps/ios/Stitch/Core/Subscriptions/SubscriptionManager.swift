import Foundation
import RevenueCat

@Observable
final class SubscriptionManager {
    static let shared = SubscriptionManager()
    private init() {}

    var isPro: Bool = false
    var customerInfo: CustomerInfo?

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

    /// Call from a long-lived task (e.g. .task on RootView) to keep isPro in sync.
    func listenForUpdates() async {
        for await info in Purchases.shared.customerInfoStream {
            updateState(from: info)
        }
    }

    // MARK: - Private

    private func updateState(from info: CustomerInfo) {
        customerInfo = info
        isPro = info.entitlements["Stitch Pro"]?.isActive == true
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
