import SwiftUI
import AuthenticationServices
import ClerkKit
import RevenueCatUI

struct SettingsView: View {
    @Environment(Clerk.self) private var clerk
    @Environment(SubscriptionManager.self) private var subscriptions
    @Environment(ThemeManager.self) private var theme

    @State private var showPaywall = false
    @State private var showCustomerCenter = false

    var body: some View {
        NavigationStack {
            List {
                Section("Subscription") {
                    if subscriptions.isPro {
                        Label("Stitch Pro — Active", systemImage: "checkmark.seal.fill")
                            .foregroundStyle(theme.primary)

                        Button("Manage Subscription") {
                            showCustomerCenter = true
                        }
                    } else {
                        Button {
                            showPaywall = true
                        } label: {
                            Label("Upgrade to Pro", systemImage: "crown")
                        }

                        Button {
                            Task { try? await subscriptions.restorePurchases() }
                        } label: {
                            Text("Restore Purchases")
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                RavelrySection()

                CraftPreferenceSection()

                Section("Appearance") {
                    NavigationLink {
                        ThemeSettingsView()
                    } label: {
                        Label("Appearance", systemImage: "paintbrush")
                    }
                }

                Section("Body measurements") {
                    NavigationLink {
                        MeasurementsView()
                    } label: {
                        Label("My measurements", systemImage: "figure.stand")
                    }
                }

                Section("Feed") {
                    NavigationLink {
                        ActivitySharingView()
                    } label: {
                        Label("Activity sharing", systemImage: "antenna.radiowaves.left.and.right")
                    }
                }

                Section("Account") {
                    Button(role: .destructive) {
                        Task {
                            await SubscriptionManager.shared.logOut()
                            await ClerkManager.shared.signOut()
                        }
                    } label: {
                        Text("Sign Out")
                    }
                }
            }
            .listStyle(.plain)
            .navigationTitle("Settings")
            .sheet(isPresented: $showPaywall) {
                StitchPaywallView()
            }
            .sheet(isPresented: $showCustomerCenter) {
                CustomerCenterView()
            }
        }
        .task { await subscriptions.refresh() }
    }
}

// MARK: - Ravelry OAuth Coordinator

/// Retains the ASWebAuthenticationSession and provides a presentation anchor.
private class OAuthCoordinator: NSObject, ASWebAuthenticationPresentationContextProviding {
    var session: ASWebAuthenticationSession?

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        // Return the first key window scene's window
        guard let scene = UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene,
              let window = scene.windows.first(where: { $0.isKeyWindow }) else {
            return ASPresentationAnchor()
        }
        return window
    }
}

// MARK: - Ravelry Section

private struct RavelrySection: View {
    @State private var connection: RavelryConnection?
    @State private var isLoading = false
    @State private var isSyncing = false
    @State private var isConnecting = false
    @State private var errorMessage: String?
    @State private var showSyncView = false

    var body: some View {
        Section("Ravelry") {
            if isLoading {
                ProgressView()
            } else if let conn = connection, conn.connected {
                // Connected state
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                    Text("@\(conn.ravelryUsername ?? "")")
                    Spacer()
                    Text("Connected")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Button {
                    Task { await triggerSync() }
                } label: {
                    HStack {
                        Label("Sync from Ravelry", systemImage: "arrow.triangle.2.circlepath")
                        if isSyncing {
                            Spacer()
                            ProgressView().scaleEffect(0.7)
                        }
                    }
                }
                .disabled(isSyncing)

                if let syncedAt = conn.syncedAt {
                    Text("Last synced \(syncedAt.formatted(.relative(presentation: .named)))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Button(role: .destructive) {
                    Task { await disconnectRavelry() }
                } label: {
                    Label("Disconnect Ravelry", systemImage: "link.badge.plus")
                        .foregroundStyle(.red)
                }
            } else {
                // Not connected
                Button {
                    Task { await startOAuthFlow() }
                } label: {
                    HStack {
                        Label("Connect Ravelry", systemImage: "link")
                        Spacer()
                        if isConnecting {
                            ProgressView()
                                .scaleEffect(0.8)
                        }
                    }
                }
                .disabled(isConnecting)
            }
        }
        .task { await loadStatus() }
        .sheet(isPresented: $showSyncView) {
            RavelerySyncView()
        }
        .onChange(of: showSyncView) { _, isShowing in
            if !isShowing { Task { await loadStatus(showLoading: false) } }
        }
        .alert("Ravelry Error", isPresented: .init(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button("OK") { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "")
        }
    }

    @MainActor
    private func startOAuthFlow() async {
        isConnecting = true
        defer { isConnecting = false }

        do {
            // Step 1: Get the authorization URL and encrypted state from our API
            struct ConnectResponse: Decodable {
                let url: String
                let state: String
            }
            let response: APIResponse<ConnectResponse> = try await APIClient.shared.get(
                "/integrations/ravelry/connect?source=ios"
            )

            guard let authURL = URL(string: response.data.url) else {
                errorMessage = "Invalid authorization URL from server"
                return
            }
            let encryptedState = response.data.state

            // Step 2: Open ASWebAuthenticationSession to authorize on Ravelry
            // Ravelry will redirect to our callback URL which redirects to stitch://
            let callbackURL: URL = try await withCheckedThrowingContinuation { continuation in
                let coordinator = OAuthCoordinator()

                let session = ASWebAuthenticationSession(
                    url: authURL,
                    callbackURLScheme: "stitch"
                ) { callbackURL, error in
                    if let error {
                        continuation.resume(throwing: error)
                    } else if let callbackURL {
                        continuation.resume(returning: callbackURL)
                    } else {
                        continuation.resume(throwing: URLError(.cancelled))
                    }
                }
                session.presentationContextProvider = coordinator
                session.prefersEphemeralWebBrowserSession = false

                coordinator.session = session
                objc_setAssociatedObject(session, "coordinator", coordinator, .OBJC_ASSOCIATION_RETAIN)

                session.start()
            }

            // Step 3: Extract oauth_token and oauth_verifier from the callback URL
            let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false)
            let queryItems = components?.queryItems ?? []

            if let error = queryItems.first(where: { $0.name == "error" })?.value {
                errorMessage = "Ravelry connection failed: \(error)"
                return
            }

            guard let oauthToken = queryItems.first(where: { $0.name == "oauth_token" })?.value,
                  let oauthVerifier = queryItems.first(where: { $0.name == "oauth_verifier" })?.value else {
                errorMessage = "Missing authorization data from Ravelry"
                return
            }
            let username = queryItems.first(where: { $0.name == "username" })?.value

            // Step 4: Exchange tokens via our authenticated API endpoint
            struct ExchangeResponse: Decodable {
                let username: String
            }
            var exchangeBody: [String: String] = [
                "oauth_token": oauthToken,
                "oauth_verifier": oauthVerifier,
                "state": encryptedState,
            ]
            if let username { exchangeBody["username"] = username }

            let _: APIResponse<ExchangeResponse> = try await APIClient.shared.post(
                "/integrations/ravelry/exchange",
                body: exchangeBody
            )

            // Step 5: Reload connection status and auto-trigger sync
            await loadStatus()
            showSyncView = true

        } catch let error as ASWebAuthenticationSessionError where error.code == .canceledLogin {
            // User cancelled — not an error
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func loadStatus(showLoading: Bool = true) async {
        if showLoading { isLoading = true }
        defer { if showLoading { isLoading = false } }
        do {
            let response: APIResponse<RavelryConnection> = try await APIClient.shared.get(
                "/integrations/ravelry/status?validate=true"
            )
            connection = response.data
        } catch is CancellationError {
            // View dismissed — not an error
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func triggerSync() async {
        isSyncing = true
        do {
            struct Empty: Decodable {}
            let _: APIResponse<Empty> = try await APIClient.shared.post(
                "/integrations/ravelry/sync"
            )
        } catch is CancellationError {
            // Ignore
        } catch {
            errorMessage = "Sync failed: \(error.localizedDescription)"
        }
        isSyncing = false
        await loadStatus(showLoading: false)
    }

    private func disconnectRavelry() async {
        do {
            let _ = try await APIClient.shared.post(
                "/integrations/ravelry/disconnect",
                body: [:] as [String: Any]
            )
        } catch {
            // Even if decode fails, the server likely disconnected
        }
        connection = nil
    }
}

// MARK: - Craft Preference Section

private struct CraftPreferenceSection: View {
    @Environment(ThemeManager.self) private var theme
    @State private var craftPref: String

    init() {
        _craftPref = State(initialValue: UserDefaults.standard.string(forKey: "stitch_craft_preference") ?? "both")
    }

    var body: some View {
        Section {
            HStack {
                Label("My craft", systemImage: "hands.and.sparkles")
                Spacer()
                Picker("", selection: $craftPref) {
                    Text("Knitting").tag("knitting")
                    Text("Crochet").tag("crocheting")
                    Text("Both").tag("both")
                }
                .labelsHidden()
                .tint(theme.primary)
            }
            .onChange(of: craftPref) { _, newValue in
                UserDefaults.standard.set(newValue, forKey: "stitch_craft_preference")
                GlossaryCache.shared.clearCache()
                Task { await GlossaryCache.shared.refresh() }
            }
        } header: {
            Text("Craft")
        } footer: {
            Text("Filters glossary, tutorials, and suggestions to match your craft.")
        }
    }
}
