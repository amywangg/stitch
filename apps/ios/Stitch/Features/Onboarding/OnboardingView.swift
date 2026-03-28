import SwiftUI
import ClerkKit
import SafariServices

// MARK: - Onboarding View

struct OnboardingView: View {
    var onComplete: () -> Void

    @Environment(Clerk.self) private var clerk
    @Environment(ThemeManager.self) private var theme
    // 0 welcome, 1 craft (+knitting style sub), 2 experience, 3 ravelry, 4 measurements, 5 first project, 6 done
    @State private var step = 0
    @State private var totalSteps = 7
    @State private var craftPref: CraftPref?
    @State private var knittingStyle: String?
    @State private var showKnittingStylePicker = false
    @State private var experienceLevel: String?
    @State private var doneAppeared = false
    @State private var showRavelrySafari = false
    @State private var measurementsVM = MeasurementsViewModel()

    private var firstName: String { clerk.user?.firstName ?? "" }
    private var ravelryConnectURL: URL {
        URL(string: AppConfig.apiBaseURL + "/integrations/ravelry/connect")!
    }

    var body: some View {
        ZStack {
            Color(hex: "#0A0A0A").ignoresSafeArea()
            RadialGradient(
                colors: [
                    theme.primary.opacity(step == totalSteps - 1 ? 0.35 : 0.2),
                    .clear
                ],
                center: UnitPoint(x: 0.5, y: step == totalSteps - 1 ? 0.4 : -0.05),
                startRadius: 0,
                endRadius: step == totalSteps - 1 ? 450 : 350
            )
            .ignoresSafeArea()
            .animation(.easeInOut(duration: 0.6), value: step)

            VStack(spacing: 0) {
                // Progress dots — hidden on welcome and done
                if step > 0 && step < totalSteps - 1 {
                    progressDots
                        .padding(.top, 12)
                }

                switch step {
                case 0: welcomeStep
                case 1: craftStep
                case 2: experienceStep
                case 3: ravelryStep
                case 4: measurementsStep
                case 5: firstProjectStep
                case 6: doneStep
                default: EmptyView()
                }
            }
        }
        .preferredColorScheme(.dark)
        .animation(.easeInOut(duration: 0.35), value: step)
        .sheet(isPresented: $showRavelrySafari) {
            SafariView(url: ravelryConnectURL).ignoresSafeArea()
        }
    }

    // MARK: - Progress Dots

    private var progressDots: some View {
        HStack(spacing: 6) {
            ForEach(1..<(totalSteps - 1), id: \.self) { i in
                Capsule()
                    .fill(i <= step ? theme.primary : Color(hex: "#3A3A3C"))
                    .frame(width: i == step ? 20 : 8, height: 4)
                    .animation(.spring(response: 0.3, dampingFraction: 0.7), value: step)
            }
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
                            colors: [theme.primary, Color(hex: "#FF8E53")],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ))
                        .frame(width: 96, height: 96)
                        .shadow(color: theme.primary.opacity(0.55), radius: 28, y: 12)
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
                            Text("Hi \(firstName)!")
                                .font(.system(size: 30, weight: .bold))
                                .foregroundStyle(.white)
                            Text("Welcome to Stitch")
                                .font(.system(size: 20, weight: .semibold))
                                .foregroundStyle(theme.primary)
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

                AuthPrimaryButton(title: "Let's get set up", isLoading: false, disabled: false) {
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

    // MARK: - Step 1: Craft Preference

    private var craftStep: some View {
        VStack(spacing: 0) {
            if showKnittingStylePicker {
                knittingStyleSubstep
            } else {
                craftPreferenceContent
            }
        }
    }

    private var craftPreferenceContent: some View {
        VStack(spacing: 0) {
            skipButton(to: 2, mark: ["craft_preference_set": true])
                .frame(maxWidth: .infinity, alignment: .trailing)
                .padding(.horizontal, 28)
                .padding(.top, 8)

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
                onboardCard(emoji: "🧶", title: "Knitting", subtitle: "Cast on, knit, purl, repeat") {
                    selectCraft(.knitting)
                }
                onboardCard(emoji: "🪡", title: "Crocheting", subtitle: "Hook, yarn, and create") {
                    selectCraft(.crocheting)
                }
                onboardCard(emoji: "✨", title: "Both!", subtitle: "I love all fibre arts") {
                    selectCraft(.both)
                }
            }
            .padding(.horizontal, 24)

            Spacer()
        }
    }

    private func selectCraft(_ pref: CraftPref) {
        craftPref = pref
        UserDefaults.standard.set(pref.rawValue, forKey: "stitch_craft_preference")
        Task {
            try? await APIClient.shared.patch(
                "/onboarding", body: ["craft_preference_set": true]
            ) as APIResponse<EmptyData>
            if pref == .knitting || pref == .both {
                withAnimation { showKnittingStylePicker = true }
            } else {
                withAnimation { step = 2 }
            }
        }
    }

    private var knittingStyleSubstep: some View {
        VStack(spacing: 0) {
            Button {
                withAnimation { showKnittingStylePicker = false; step = 2 }
            } label: {
                Text("Skip")
                    .font(.subheadline)
                    .foregroundStyle(Color(hex: "#636366"))
            }
            .frame(maxWidth: .infinity, alignment: .trailing)
            .padding(.horizontal, 28)
            .padding(.top, 8)

            VStack(spacing: 6) {
                Text("How do you knit?")
                    .font(.title2.bold())
                    .foregroundStyle(.white)
                Text("This helps us show the right tutorial videos")
                    .font(.subheadline)
                    .foregroundStyle(Color(hex: "#8E8E93"))
            }
            .padding(.top, 36)
            .padding(.bottom, 36)

            VStack(spacing: 12) {
                onboardCard(icon: "hand.raised.fill", title: "English (throwing)", subtitle: "Yarn held in your right hand") {
                    saveKnittingStyle("english")
                }
                onboardCard(icon: "hand.raised", title: "Continental (picking)", subtitle: "Yarn held in your left hand") {
                    saveKnittingStyle("continental")
                }
            }
            .padding(.horizontal, 24)

            Spacer()
        }
    }

    private func saveKnittingStyle(_ style: String) {
        knittingStyle = style
        UserDefaults.standard.set(style, forKey: "stitch_knitting_style")
        Task {
            struct Body: Encodable { let knitting_style: String }
            try? await APIClient.shared.patch("/users/me", body: Body(knitting_style: style)) as APIResponse<EmptyData>
            withAnimation { showKnittingStylePicker = false; step = 2 }
        }
    }

    // MARK: - Step 3: Experience Level

    private var experienceStep: some View {
        VStack(spacing: 0) {
            skipButton(to: 3, mark: ["experience_level_set": true])
                .frame(maxWidth: .infinity, alignment: .trailing)
                .padding(.horizontal, 28)
                .padding(.top, 8)

            VStack(spacing: 6) {
                Text("What's your experience?")
                    .font(.title2.bold())
                    .foregroundStyle(.white)
                Text("We'll tailor tutorials and suggestions")
                    .font(.subheadline)
                    .foregroundStyle(Color(hex: "#8E8E93"))
            }
            .padding(.top, 36)
            .padding(.bottom, 36)

            VStack(spacing: 12) {
                experienceCard(
                    icon: "leaf",
                    title: "Beginner",
                    subtitle: "Just starting out or learning the basics",
                    level: "beginner"
                )
                experienceCard(
                    icon: "flame",
                    title: "Intermediate",
                    subtitle: "Comfortable with patterns and techniques",
                    level: "intermediate"
                )
                experienceCard(
                    icon: "star.fill",
                    title: "Advanced",
                    subtitle: "Experienced with complex projects",
                    level: "advanced"
                )
            }
            .padding(.horizontal, 24)

            Spacer()
        }
    }

    private func experienceCard(icon: String, title: String, subtitle: String, level: String) -> some View {
        onboardCard(icon: icon, title: title, subtitle: subtitle) {
            experienceLevel = level
            Task {
                struct Body: Encodable { let experience_level: String }
                try? await APIClient.shared.patch("/users/me", body: Body(experience_level: level)) as APIResponse<EmptyData>
                try? await APIClient.shared.patch("/onboarding", body: ["experience_level_set": true]) as APIResponse<EmptyData>
                withAnimation { step = 3 }
            }
        }
    }

    // MARK: - Step 4: Ravelry

    private var ravelryStep: some View {
        VStack(spacing: 0) {
            skipButton(to: 4, mark: ["ravelry_prompted": true])
                .frame(maxWidth: .infinity, alignment: .trailing)
                .padding(.horizontal, 28)
                .padding(.top, 8)

            Spacer()

            VStack(spacing: 28) {
                ZStack {
                    Circle()
                        .fill(Color(hex: "#E74C3C").opacity(0.12))
                        .frame(width: 90, height: 90)
                    Text("R")
                        .font(.system(size: 42, weight: .bold, design: .rounded))
                        .foregroundStyle(Color(hex: "#E74C3C"))
                }

                VStack(spacing: 10) {
                    Text("Already on Ravelry?")
                        .font(.title2.bold())
                        .foregroundStyle(.white)
                    Text("Import your projects, stash, and queue\nin one tap.")
                        .font(.subheadline)
                        .foregroundStyle(Color(hex: "#8E8E93"))
                        .multilineTextAlignment(.center)
                        .lineSpacing(4)
                }

                VStack(spacing: 8) {
                    ravelryBenefit(icon: "folder.fill",     text: "All your projects")
                    ravelryBenefit(icon: "archivebox.fill", text: "Your yarn stash")
                    ravelryBenefit(icon: "list.bullet",     text: "Your queue")
                    ravelryBenefit(icon: "person.2.fill",   text: "Find friends on Stitch")
                }
                .padding(.horizontal, 32)
            }

            Spacer()

            VStack(spacing: 12) {
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
                        withAnimation { step = 4 }
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
        .onChange(of: showRavelrySafari) { _, isShowing in
            if !isShowing { withAnimation { step = 4 } }
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
            onContinue: { withAnimation { step = 5 } },
            onSkip: { withAnimation { step = 5 } }
        )
    }

    // MARK: - Step 6: First Project

    private var firstProjectStep: some View {
        VStack(spacing: 0) {
            skipButton(to: 6, mark: ["first_project_created": true])
                .frame(maxWidth: .infinity, alignment: .trailing)
                .padding(.horizontal, 28)
                .padding(.top, 8)

            Spacer()

            VStack(spacing: 28) {
                ZStack {
                    Circle()
                        .fill(theme.primary.opacity(0.12))
                        .frame(width: 90, height: 90)
                    Image(systemName: "hand.thumbsup.fill")
                        .font(.system(size: 38, weight: .medium))
                        .foregroundStyle(theme.primary)
                }

                VStack(spacing: 10) {
                    Text("Ready to start?")
                        .font(.title2.bold())
                        .foregroundStyle(.white)
                    Text("Set up your first project or jump\nstraight in and explore.")
                        .font(.subheadline)
                        .foregroundStyle(Color(hex: "#8E8E93"))
                        .multilineTextAlignment(.center)
                        .lineSpacing(4)
                }
            }

            Spacer()

            VStack(spacing: 12) {
                // Primary: go to done and let them start from the app
                AuthPrimaryButton(title: "I have a pattern in mind", isLoading: false, disabled: false) {
                    Task {
                        try? await APIClient.shared.patch(
                            "/onboarding", body: ["first_project_created": true]
                        ) as APIResponse<EmptyData>
                        withAnimation { step = 6 }
                    }
                }

                Button {
                    Task {
                        try? await APIClient.shared.patch(
                            "/onboarding", body: ["first_project_created": true]
                        ) as APIResponse<EmptyData>
                        withAnimation { step = 6 }
                    }
                } label: {
                    Text("Just exploring for now")
                        .font(.subheadline)
                        .foregroundStyle(Color(hex: "#636366"))
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 52)
        }
    }

    // MARK: - Step 7: Done

    private var doneStep: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: 28) {
                ZStack {
                    Circle()
                        .fill(theme.primary.opacity(0.12))
                        .frame(width: 110, height: 110)
                    Image(systemName: "checkmark")
                        .font(.system(size: 44, weight: .bold))
                        .foregroundStyle(theme.primary)
                        .scaleEffect(doneAppeared ? 1 : 0.3)
                        .opacity(doneAppeared ? 1 : 0)
                        .animation(.spring(response: 0.5, dampingFraction: 0.6).delay(0.1), value: doneAppeared)
                }

                VStack(spacing: 10) {
                    Text("You're all set!")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(.white)
                    Text(firstName.isEmpty
                         ? "Time to cast on something beautiful."
                         : "\(firstName), your crafting journey starts now.")
                        .font(.subheadline)
                        .foregroundStyle(Color(hex: "#8E8E93"))
                        .multilineTextAlignment(.center)
                }

                // Quick feature summary
                VStack(spacing: 6) {
                    featureHint(icon: "plus.circle.fill", text: "Tap + on Projects to start your first one")
                    featureHint(icon: "magnifyingglass", text: "Discover patterns on the Patterns tab")
                    featureHint(icon: "mic.fill", text: "Try voice commands while counting")
                }
                .padding(.horizontal, 32)
                .padding(.top, 8)
            }

            Spacer()

            AuthPrimaryButton(title: "Start crafting", isLoading: false, disabled: false) {
                Task {
                    try? await APIClient.shared.patch("/onboarding", body: [
                        "counter_tutorial_done": true,
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

    private func featureHint(icon: String, text: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 13))
                .foregroundStyle(theme.primary)
                .frame(width: 18)
            Text(text)
                .font(.caption)
                .foregroundStyle(Color(hex: "#8E8E93"))
            Spacer()
        }
    }

    // MARK: - Shared Card Component

    private func onboardCard(emoji: String? = nil, icon: String? = nil, title: String, subtitle: String, action: @escaping () -> Void) -> some View {
        Button { action() } label: {
            HStack(spacing: 16) {
                if let emoji {
                    Text(emoji)
                        .font(.system(size: 28))
                        .frame(width: 50, height: 50)
                        .background(Color(hex: "#252525"))
                        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                } else if let icon {
                    Image(systemName: icon)
                        .font(.system(size: 22))
                        .foregroundStyle(theme.primary)
                        .frame(width: 50, height: 50)
                        .background(Color(hex: "#252525"))
                        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(.headline).foregroundStyle(.white)
                    Text(subtitle).font(.subheadline).foregroundStyle(Color(hex: "#8E8E93"))
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color(hex: "#3A3A3C"))
            }
            .padding(14)
            .background(Color(hex: "#1C1C1E"))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(Color(hex: "#2C2C2E"), lineWidth: 1))
        }
    }

    // MARK: - Helpers

    private func skipButton(to nextStep: Int, mark body: [String: Bool]) -> some View {
        Button("Skip") {
            Task {
                _ = try? await APIClient.shared.patch("/onboarding", body: body) as APIResponse<EmptyData>
                withAnimation { step = nextStep }
            }
        }
        .font(.subheadline)
        .foregroundStyle(Color(hex: "#636366"))
    }

}

// MARK: - Supporting Types

private enum CraftPref: String { case knitting, crocheting, both }

private struct EmptyData: Decodable {}
