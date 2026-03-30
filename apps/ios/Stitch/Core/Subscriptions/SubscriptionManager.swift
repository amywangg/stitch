import Foundation
import RevenueCat

enum AppTier: String, Comparable {
    case free, plus, pro

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
    private var isConfigured = false

    var isPlusOrAbove: Bool { tier >= .plus }
    var isPro: Bool { tier == .pro }

    // MARK: - Setup

    func configure() {
        Purchases.logLevel = .debug
        Purchases.configure(withAPIKey: AppConfig.revenueCatAPIKey)
        isConfigured = true
    }

    func logIn(userId: String) async {
        guard isConfigured else { return }
        do {
            let (info, _) = try await Purchases.shared.logIn(userId)
            updateState(from: info)
        } catch {
            print("[SubscriptionManager] logIn error: \(error.localizedDescription)")
        }
    }

    func logOut() async {
        guard isConfigured else { return }
        do {
            let info = try await Purchases.shared.logOut()
            updateState(from: info)
        } catch {
            print("[SubscriptionManager] logOut error: \(error.localizedDescription)")
        }
    }

    func refresh() async {
        guard isConfigured else { return }
        do {
            let info = try await Purchases.shared.customerInfo()
            updateState(from: info)
        } catch {
            print("[SubscriptionManager] refresh error: \(error.localizedDescription)")
        }
    }

    func purchasePro() async throws {
        guard isConfigured else { throw SubscriptionError.noOfferings }
        let offerings = try await Purchases.shared.offerings()
        guard let package = offerings.current?.availablePackages.first else {
            throw SubscriptionError.noOfferings
        }
        let result = try await Purchases.shared.purchase(package: package)
        updateState(from: result.customerInfo)
    }

    func restorePurchases() async throws {
        guard isConfigured else { return }
        let info = try await Purchases.shared.restorePurchases()
        updateState(from: info)
    }

    func listenForUpdates() async {
        guard isConfigured else { return }
        for await info in Purchases.shared.customerInfoStream {
            updateState(from: info)
        }
    }

    private func updateState(from info: CustomerInfo) {
        customerInfo = info
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
        switch self { case .noOfferings: return "No subscription offerings available." }
    }
}
