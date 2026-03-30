import SwiftUI
import ClerkKit

@main
struct StitchApp: App {
    @State private var router = AppRouter()
    @State private var subscriptionManager = SubscriptionManager.shared
    @State private var themeManager = ThemeManager.shared
    @State private var notificationService = NotificationService.shared

    init() {
        ClerkManager.shared.configure()
        // RevenueCat disabled for alpha — all users get Pro
        // SubscriptionManager.shared.configure()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(router)
                .environment(Clerk.shared)
                .environment(subscriptionManager)
                .environment(themeManager)
                .environment(notificationService)
        }
    }
}

struct RootView: View {
    @Environment(Clerk.self) private var clerk
    @Environment(SubscriptionManager.self) private var subscriptions

    @State private var showSplash = true
    @State private var showSignUp = false
    @State private var onboardingDone = UserDefaults.standard.bool(forKey: "stitch_onboarding_done")

    var body: some View {
        Group {
            if showSplash {
                SplashView()
                    .transition(.opacity)
            } else if clerk.user == nil {
                if showSignUp {
                    SignUpView(onSignIn: { showSignUp = false })
                        .transition(.asymmetric(
                            insertion: .move(edge: .trailing).combined(with: .opacity),
                            removal: .move(edge: .leading).combined(with: .opacity)
                        ))
                } else {
                    SignInView(onSignUp: { showSignUp = true })
                        .transition(.opacity)
                }
            } else if !onboardingDone {
                OnboardingView {
                    withAnimation(.easeInOut(duration: 0.5)) {
                        onboardingDone = true
                    }
                }
                .transition(.opacity)
            } else {
                MainTabView()
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.35), value: showSplash)
        .animation(.easeInOut(duration: 0.3), value: clerk.user?.id)
        .animation(.easeInOut(duration: 0.28), value: showSignUp)
        .animation(.easeInOut(duration: 0.45), value: onboardingDone)
        .task {
            try? await Task.sleep(for: .seconds(1.8))
            withAnimation { showSplash = false }
        }
        .task(id: clerk.user?.id) {
            // When user signs in, associate with RevenueCat and refresh entitlements
            if let userId = clerk.user?.id {
                await subscriptions.logIn(userId: userId)
                // Start notification polling
                NotificationService.shared.startPolling()
                // Quick sync with Ravelry on login (silent, non-blocking)
                await quickRavelrySync()
            }
        }
        .task {
            // Keep subscription state in sync via async stream
            await subscriptions.listenForUpdates()
        }
    }

    /// Lightweight Ravelry sync on app open — only syncs recent project
    /// status changes and pushes local updates. Throttled server-side to once per 15 min.
    /// Silent — never shows errors or loading UI.
    private func quickRavelrySync() async {
        struct QuickSyncResult: Decodable {
            let skipped: Bool?
        }
        _ = try? await APIClient.shared.post(
            "/integrations/ravelry/sync/quick",
            body: [:] as [String: String]
        ) as APIResponse<QuickSyncResult>
    }
}
