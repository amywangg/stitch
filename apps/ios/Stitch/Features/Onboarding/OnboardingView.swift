import SwiftUI
import ClerkKit
import SafariServices

// MARK: - Onboarding View

struct OnboardingView: View {
    var onComplete: () -> Void

    @Environment(Clerk.self) private var clerk
    @State private var step = 0           // 0 welcome, 1 username, 2 craft, 3 features, 4 ravelry, 5 measurements, 6 done
    @State private var craftPref: CraftPref?
    @State private var featurePage = 0
    @State private var doneAppeared = false
    @State private var showRavelrySafari = false
    @State private var measurementsVM = MeasurementsViewModel()
    @State private var usernameInput = ""
    @State private var usernameAvailable: Bool?
    @State private var usernameMessage: String?
    @State private var isCheckingUsername = false
    @State private var isSavingUsername = false
    @State private var usernameCheckTask: Task<Void, Never>?

    private var firstName: String { clerk.user?.firstName ?? "" }
    private var ravelryConnectURL: URL {
        URL(string: AppConfig.apiBaseURL + "/integrations/ravelry/connect")!
    }

    var body: some View {
        ZStack {
            Color(hex: "#0A0A0A").ignoresSafeArea()
            RadialGradient(
                colors: [
                    Color(hex: "#FF6B6B").opacity(step == 6 ? 0.35 : 0.2),
                    .clear
                ],
                center: UnitPoint(x: 0.5, y: step == 6 ? 0.4 : -0.05),
                startRadius: 0,
                endRadius: step == 6 ? 450 : 350
            )
            .ignoresSafeArea()
            .animation(.easeInOut(duration: 0.6), value: step)

            switch step {
            case 0: welcomeStep
            case 1: usernameStep
            case 2: craftStep
            case 3: featuresStep
            case 4: ravelryStep
            case 5: measurementsStep
            case 6: doneStep
            default: EmptyView()
            }
        }
        .preferredColorScheme(.dark)
        .animation(.easeInOut(duration: 0.35), value: step)
        .animation(.easeInOut(duration: 0.35), value: usernameAvailable)
        .sheet(isPresented: $showRavelrySafari) {
            SafariView(url: ravelryConnectURL).ignoresSafeArea()
        }
    }

    // MARK: - Step 0: Welcome

    private var welcomeStep: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: 24) {
                ZStack {
                    RoundedRectangle(cornerRadius: 28, style: .continuous)
                        .fill(LinearGradient(
                            colors: [Color(hex: "#FF6B6B"), Color(hex: "#FF8E53")],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ))
                        .frame(width: 96, height: 96)
                        .shadow(color: Color(hex: "#FF6B6B").opacity(0.55), radius: 28, y: 12)
                    Text("S")
                        .font(.system(size: 50, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                }

                VStack(spacing: 10) {
                    if firstName.isEmpty {
                        Text("Welcome to Stitch")
                            .font(.system(size: 30, weight: .bold))
                            .foregroundStyle(.white)
                    } else {
                        VStack(spacing: 4) {
                            Text("Hi \(firstName)! 👋")
                                .font(.system(size: 30, weight: .bold))
                                .foregroundStyle(.white)
                            Text("Welcome to Stitch")
                                .font(.system(size: 20, weight: .semibold))
                                .foregroundStyle(Color(hex: "#FF6B6B"))
                        }
                    }
                    Text("Your knitting companion for every\nrow, project, and pattern.")
                        .font(.subheadline)
                        .foregroundStyle(Color(hex: "#8E8E93"))
                        .multilineTextAlignment(.center)
                        .lineSpacing(3)
                }
            }

            Spacer()

            AuthPrimaryButton(title: "Let's go  →", isLoading: false, disabled: false) {
                Task {
                    try? await APIClient.shared.patch(
                        "/onboarding", body: ["welcome_seen": true]
                    ) as APIResponse<EmptyData>
                    withAnimation { step = 1 }
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 52)
        }
    }

    // MARK: - Step 1: Username

    private var usernameStep: some View {
        VStack(spacing: 0) {
            skipButton(to: 2, mark: [:])
                .frame(maxWidth: .infinity, alignment: .trailing)
                .padding(.horizontal, 28)
                .padding(.top, 20)

            Spacer()

            VStack(spacing: 28) {
                ZStack {
                    Circle()
                        .fill(Color(hex: "#4ECDC4").opacity(0.12))
                        .frame(width: 90, height: 90)
                    Image(systemName: "at")
                        .font(.system(size: 38, weight: .medium))
                        .foregroundStyle(Color(hex: "#4ECDC4"))
                }

                VStack(spacing: 10) {
                    Text("Choose a username")
                        .font(.title2.bold())
                        .foregroundStyle(.white)
                    Text("This is how others will find you.\nYou can change it later.")
                        .font(.subheadline)
                        .foregroundStyle(Color(hex: "#8E8E93"))
                        .multilineTextAlignment(.center)
                        .lineSpacing(3)
                }

                VStack(spacing: 12) {
                    HStack(spacing: 0) {
                        Text("@")
                            .font(.title3.weight(.medium))
                            .foregroundStyle(Color(hex: "#636366"))
                            .padding(.leading, 16)

                        TextField("username", text: $usernameInput)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .font(.title3)
                            .foregroundStyle(.white)
                            .padding(.vertical, 14)
                            .padding(.leading, 4)
                            .padding(.trailing, 16)
                            .onChange(of: usernameInput) {
                                let sanitized = usernameInput.lowercased()
                                    .replacingOccurrences(of: " ", with: "_")
                                if sanitized != usernameInput {
                                    usernameInput = sanitized
                                }
                                checkUsernameDebounced()
                            }

                        if isCheckingUsername {
                            ProgressView()
                                .controlSize(.small)
                                .padding(.trailing, 14)
                        } else if let available = usernameAvailable {
                            Image(systemName: available ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .foregroundStyle(available ? Color(hex: "#4ECDC4") : Color(hex: "#FF6B6B"))
                                .padding(.trailing, 14)
                        }
                    }
                    .background(Color(hex: "#1C1C1E"))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .strokeBorder(
                            usernameAvailable == true ? Color(hex: "#4ECDC4").opacity(0.5) :
                            usernameAvailable == false ? Color(hex: "#FF6B6B").opacity(0.5) :
                            Color(hex: "#2C2C2E"),
                            lineWidth: 1
                        ))

                    if let message = usernameMessage {
                        Text(message)
                            .font(.caption)
                            .foregroundStyle(usernameAvailable == true ? Color(hex: "#4ECDC4") : Color(hex: "#FF6B6B"))
                    }

                    Text("3-20 characters · letters, numbers, underscores")
                        .font(.caption2)
                        .foregroundStyle(Color(hex: "#636366"))
                }
                .padding(.horizontal, 32)
            }

            Spacer()

            AuthPrimaryButton(
                title: isSavingUsername ? "Saving..." : "Continue",
                isLoading: isSavingUsername,
                disabled: usernameAvailable != true || isSavingUsername
            ) {
                Task { await saveUsername() }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 52)
        }
    }

    private func checkUsernameDebounced() {
        usernameCheckTask?.cancel()
        usernameAvailable = nil
        usernameMessage = nil

        let input = usernameInput
        guard input.count >= 3 else {
            if !input.isEmpty {
                usernameMessage = "Too short"
                usernameAvailable = false
            }
            return
        }
        guard input.count <= 20 else {
            usernameMessage = "Too long"
            usernameAvailable = false
            return
        }

        isCheckingUsername = true
        usernameCheckTask = Task {
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }

            do {
                struct CheckResponse: Decodable {
                    let username: String
                    let available: Bool
                    let reason: String?
                }
                let response: APIResponse<CheckResponse> = try await APIClient.shared.get(
                    "/users/me/username/check?q=\(input)"
                )
                guard !Task.isCancelled else { return }
                await MainActor.run {
                    isCheckingUsername = false
                    usernameAvailable = response.data.available
                    usernameMessage = response.data.available ? "Available" : response.data.reason
                }
            } catch {
                guard !Task.isCancelled else { return }
                await MainActor.run {
                    isCheckingUsername = false
                    usernameAvailable = false
                    usernameMessage = "Could not check availability"
                }
            }
        }
    }

    private func saveUsername() async {
        isSavingUsername = true
        defer { isSavingUsername = false }

        do {
            struct Body: Encodable { let username: String }
            let _: APIResponse<User> = try await APIClient.shared.patch(
                "/users/me/username",
                body: Body(username: usernameInput)
            )
            withAnimation { step = 2 }
        } catch {
            usernameMessage = "Failed to save username"
            usernameAvailable = false
        }
    }

    // MARK: - Step 2: Craft Preference

    private var craftStep: some View {
        VStack(spacing: 0) {
            skipButton(to: 3, mark: ["craft_preference_set": true])
                .frame(maxWidth: .infinity, alignment: .trailing)
                .padding(.horizontal, 28)
                .padding(.top, 20)

            VStack(spacing: 6) {
                Text("What do you make?")
                    .font(.title2.bold())
                    .foregroundStyle(.white)
                Text("We'll personalise your experience")
                    .font(.subheadline)
                    .foregroundStyle(Color(hex: "#8E8E93"))
            }
            .padding(.top, 36)
            .padding(.bottom, 36)

            VStack(spacing: 12) {
                craftCard(emoji: "🧶", title: "Knitting",    subtitle: "Cast on, knit, purl, repeat",   pref: .knitting)
                craftCard(emoji: "🪡", title: "Crocheting", subtitle: "Hook, yarn, and create",          pref: .crocheting)
                craftCard(emoji: "✨", title: "Both!",      subtitle: "I love all fibre arts",           pref: .both)
            }
            .padding(.horizontal, 24)

            Spacer()
        }
    }

    private func craftCard(emoji: String, title: String, subtitle: String, pref: CraftPref) -> some View {
        Button {
            craftPref = pref
            UserDefaults.standard.set(pref.rawValue, forKey: "stitch_craft_preference")
            Task {
                try? await APIClient.shared.patch(
                    "/onboarding", body: ["craft_preference_set": true]
                ) as APIResponse<EmptyData>
                withAnimation { step = 3 }
            }
        } label: {
            HStack(spacing: 16) {
                Text(emoji)
                    .font(.system(size: 30))
                    .frame(width: 54, height: 54)
                    .background(Color(hex: "#252525"))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(.headline).foregroundStyle(.white)
                    Text(subtitle).font(.subheadline).foregroundStyle(Color(hex: "#8E8E93"))
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color(hex: "#3A3A3C"))
            }
            .padding(16)
            .background(Color(hex: "#1C1C1E"))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(Color(hex: "#2C2C2E"), lineWidth: 1))
        }
    }

    // MARK: - Step 2: Feature Highlights

    private var featuresStep: some View {
        let features: [FeatureCard] = [
            .init(icon: "arrow.up.circle.fill", color: Color(hex: "#FF6B6B"),
                  title: "Row Counter",
                  description: "Count rows with a tap, voice command, or hardware button. Never lose your place again."),
            .init(icon: "sparkles", color: Color(hex: "#4ECDC4"),
                  title: "AI Patterns",
                  description: "Upload any PDF and get an instant AI-powered breakdown — sections, rows, and all."),
            .init(icon: "archivebox.fill", color: Color(hex: "#BF5AF2"),
                  title: "Projects & Stash",
                  description: "Track every WIP, stash your yarn, build your queue, and sync with Ravelry."),
        ]

        return VStack(spacing: 0) {
            VStack(spacing: 6) {
                Text("Here's what you've got")
                    .font(.title2.bold())
                    .foregroundStyle(.white)
                Text("Swipe to explore")
                    .font(.subheadline)
                    .foregroundStyle(Color(hex: "#8E8E93"))
            }
            .padding(.top, 52)
            .padding(.bottom, 28)

            TabView(selection: $featurePage) {
                ForEach(Array(features.enumerated()), id: \.0) { i, f in
                    featureCardView(f).tag(i).padding(.horizontal, 24)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .frame(height: 310)

            HStack(spacing: 6) {
                ForEach(0..<3, id: \.self) { i in
                    Capsule()
                        .fill(featurePage == i ? Color(hex: "#FF6B6B") : Color(hex: "#3A3A3C"))
                        .frame(width: featurePage == i ? 22 : 8, height: 8)
                        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: featurePage)
                }
            }
            .padding(.top, 20)
            .padding(.bottom, 32)

            AuthPrimaryButton(title: "Continue", isLoading: false, disabled: false) {
                withAnimation { step = 4 }
            }
            .padding(.horizontal, 24)

            Spacer()
        }
    }

    private func featureCardView(_ f: FeatureCard) -> some View {
        VStack(spacing: 22) {
            ZStack {
                Circle().fill(f.color.opacity(0.12)).frame(width: 90, height: 90)
                Image(systemName: f.icon)
                    .font(.system(size: 38, weight: .medium))
                    .foregroundStyle(f.color)
            }
            VStack(spacing: 10) {
                Text(f.title).font(.title3.bold()).foregroundStyle(.white)
                Text(f.description)
                    .font(.subheadline)
                    .foregroundStyle(Color(hex: "#8E8E93"))
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
            }
        }
        .padding(28)
        .frame(maxWidth: .infinity)
        .background(Color(hex: "#1C1C1E"))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 24, style: .continuous)
            .strokeBorder(Color(hex: "#2C2C2E"), lineWidth: 1))
    }

    // MARK: - Step 3: Ravelry

    private var ravelryStep: some View {
        VStack(spacing: 0) {
            skipButton(to: 5, mark: ["ravelry_prompted": true])
                .frame(maxWidth: .infinity, alignment: .trailing)
                .padding(.horizontal, 28)
                .padding(.top, 20)

            Spacer()

            VStack(spacing: 28) {
                // Ravelry icon mark
                ZStack {
                    Circle()
                        .fill(Color(hex: "#E74C3C").opacity(0.12))
                        .frame(width: 90, height: 90)
                    Circle()
                        .strokeBorder(Color(hex: "#E74C3C").opacity(0.3), lineWidth: 2)
                        .frame(width: 90, height: 90)
                    Text("R")
                        .font(.system(size: 42, weight: .bold, design: .rounded))
                        .foregroundStyle(Color(hex: "#E74C3C"))
                }

                VStack(spacing: 10) {
                    Text("Already on Ravelry?")
                        .font(.title2.bold())
                        .foregroundStyle(.white)

                    Text("Connect your account to instantly import\nyour projects, stash, and queue.")
                        .font(.subheadline)
                        .foregroundStyle(Color(hex: "#8E8E93"))
                        .multilineTextAlignment(.center)
                        .lineSpacing(4)
                }

                // What you get
                VStack(spacing: 8) {
                    ravelryBenefit(icon: "folder.fill",      text: "All your projects, imported")
                    ravelryBenefit(icon: "archivebox.fill",  text: "Your stash & yarn stash")
                    ravelryBenefit(icon: "list.bullet",      text: "Your queue, ready to knit")
                }
                .padding(.horizontal, 32)
            }

            Spacer()

            VStack(spacing: 12) {
                // Connect button — styled with Ravelry red
                Button {
                    Task {
                        try? await APIClient.shared.patch(
                            "/onboarding", body: ["ravelry_prompted": true]
                        ) as APIResponse<EmptyData>
                    }
                    showRavelrySafari = true
                } label: {
                    HStack(spacing: 8) {
                        Text("R")
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                            .frame(width: 26, height: 26)
                            .background(Color(hex: "#E74C3C"))
                            .clipShape(Circle())
                        Text("Connect Ravelry")
                            .font(.headline)
                            .foregroundStyle(.white)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(Color(hex: "#1C1C1E"))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .strokeBorder(Color(hex: "#E74C3C").opacity(0.5), lineWidth: 1.5))
                }

                Button {
                    Task {
                        try? await APIClient.shared.patch(
                            "/onboarding", body: ["ravelry_prompted": true]
                        ) as APIResponse<EmptyData>
                        withAnimation { step = 5 }
                    }
                } label: {
                    Text("I'll do this later")
                        .font(.subheadline)
                        .foregroundStyle(Color(hex: "#636366"))
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 52)
        }
        // After returning from Safari, advance to done
        .onChange(of: showRavelrySafari) { _, isShowing in
            if !isShowing { withAnimation { step = 5 } }
        }
    }

    private func ravelryBenefit(icon: String, text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(Color(hex: "#E74C3C"))
                .frame(width: 20)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(Color(hex: "#8E8E93"))
            Spacer()
        }
    }

    // MARK: - Step 5: Measurements

    private var measurementsStep: some View {
        OnboardingMeasurementsStep(
            viewModel: measurementsVM,
            onContinue: { withAnimation { step = 6 } },
            onSkip: { withAnimation { step = 6 } }
        )
    }

    // MARK: - Step 6: Done

    private var doneStep: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: 28) {
                ZStack {
                    Circle()
                        .fill(Color(hex: "#FF6B6B").opacity(0.12))
                        .frame(width: 110, height: 110)
                    Circle()
                        .strokeBorder(Color(hex: "#FF6B6B").opacity(0.3), lineWidth: 2)
                        .frame(width: 110, height: 110)
                    Image(systemName: "checkmark")
                        .font(.system(size: 44, weight: .bold))
                        .foregroundStyle(Color(hex: "#FF6B6B"))
                        .scaleEffect(doneAppeared ? 1 : 0.3)
                        .opacity(doneAppeared ? 1 : 0)
                        .animation(.spring(response: 0.5, dampingFraction: 0.6).delay(0.1), value: doneAppeared)
                }

                VStack(spacing: 10) {
                    Text("You're all set! 🎉")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(.white)
                    Text(firstName.isEmpty
                         ? "Time to cast on something beautiful."
                         : "\(firstName)'s knitting journey starts now.")
                        .font(.subheadline)
                        .foregroundStyle(Color(hex: "#8E8E93"))
                        .multilineTextAlignment(.center)
                }
            }

            Spacer()

            AuthPrimaryButton(title: "Start exploring  →", isLoading: false, disabled: false) {
                Task {
                    try? await APIClient.shared.patch("/onboarding", body: [
                        "counter_tutorial_done": true,
                        "experience_level_set": true,
                    ]) as APIResponse<EmptyData>
                    UserDefaults.standard.set(true, forKey: "stitch_onboarding_done")
                    onComplete()
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 52)
        }
        .onAppear { doneAppeared = true }
        .onDisappear { doneAppeared = false }
    }

    // MARK: - Helpers

    private func skipButton(to nextStep: Int, mark body: [String: Bool]) -> some View {
        Button("Skip") {
            Task {
                try? await APIClient.shared.patch("/onboarding", body: body) as APIResponse<EmptyData>
                withAnimation { step = nextStep }
            }
        }
        .font(.subheadline)
        .foregroundStyle(Color(hex: "#636366"))
    }
}

// MARK: - Supporting Types

private enum CraftPref: String { case knitting, crocheting, both }

private struct FeatureCard {
    let icon: String; let color: Color; let title: String; let description: String
}

private struct EmptyData: Decodable {}

// MARK: - Safari Wrapper

private struct SafariView: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> SFSafariViewController { SFSafariViewController(url: url) }
    func updateUIViewController(_ vc: SFSafariViewController, context: Context) {}
}
