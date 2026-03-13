import Foundation
import ClerkKit

/// Thin wrapper around Clerk.shared.
/// Views use @Environment(Clerk.self) directly for reactive auth state.
/// This class is kept for APIClient's sessionToken() and for configure().
final class ClerkManager {
    static let shared = ClerkManager()
    private init() {}

    @MainActor func configure() {
        Clerk.configure(publishableKey: AppConfig.clerkPublishableKey)
    }

    func sessionToken() async -> String? {
        // Retry a few times: right after sign-up the session can take a moment to activate
        for attempt in 0..<4 {
            if let token = try? await Clerk.shared.auth.getToken() {
                return token
            }
            if attempt < 3 {
                try? await Task.sleep(for: .milliseconds(400))
            }
        }
        return nil
    }

    func signOut() async {
        try? await Clerk.shared.auth.signOut()
    }
}
