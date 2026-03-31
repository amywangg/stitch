import SwiftUI
import ClerkKit
import SafariServices

// MARK: - Onboarding View
// 0: Welcome + Username + Photo
// 1: Craft + Experience (skippable)
// 2: Connect Ravelry (skippable)
// 3: Measurements (skippable)
// 4: Done + Tour

struct OnboardingView: View {
    var onComplete: () -> Void

    @Environment(Clerk.self) private var clerk
    @Environment(ThemeManager.self) private var theme

    @State private var step = 0
    private let totalSteps = 5

    // Step 0: Profile
    @State private var username = ""
    @State private var usernameAvailable: Bool?
    @State private var usernameMessage: String?
    @State private var isCheckingUsername = false
    @State private var usernameCheckTask: Task<Void, Never>?
    @State private var selectedImage: UIImage?
    @State private var showImagePicker = false
    @State private var editFirstName = ""
    @State private var editLastName = ""
    @State private var isSavingProfile = false

    // Step 1: Craft + Experience
    @State private var craftPref: CraftPref?
    @State private var knittingStyle: String?
    @State private var showKnittingStylePicker = false
    @State private var showExperiencePicker = false
    @State private var experienceLevel: String?

    // Step 2: Ravelry
    @State private var showRavelrySafari = false

    // Step 3: Measurements
    @State private var measurementsVM = MeasurementsViewModel()

    // Step 4: Done
    @State private var doneAppeared = false

    private var firstName: String { clerk.user?.firstName ?? "" }
    private var ravelryConnectURL: URL {
        URL(string: AppConfig.apiBaseURL + "/integrations/ravelry/connect")!
    }

    var body: some View {
        ZStack {
            Color(hex: "#0A0A0A").ignoresSafeArea()
            RadialGradient(
                colors: [theme.primary.opacity(step == totalSteps - 1 ? 0.35 : 0.2), .clear],
                center: UnitPoint(x: 0.5, y: step == totalSteps - 1 ? 0.4 : -0.05),
                startRadius: 0, endRadius: step == totalSteps - 1 ? 450 : 350
            )
            .ignoresSafeArea()
            .animation(.easeInOut(duration: 0.6), value: step)

            VStack(spacing: 0) {
                if step > 0 && step < totalSteps - 1 { progressDots.padding(.top, 12) }
                switch step {
                case 0: welcomeProfileStep
                case 1: craftExperienceStep
                case 2: ravelryStep
                case 3: measurementsStep
                case 4: doneStep
                default: EmptyView()
                }
            }
        }
        .preferredColorScheme(.dark)
        .animation(.easeInOut(duration: 0.35), value: step)
        .sheet(isPresented: $showImagePicker) {
            ImagePicker(image: $selectedImage)
        }
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

    // MARK: - Step 0: Welcome + Profile Setup

    private var welcomeProfileStep: some View {
        ScrollView {
            VStack(spacing: 24) {
                Spacer().frame(height: 30)

                // Logo
                ZStack {
                    RoundedRectangle(cornerRadius: 28, style: .continuous)
                        .fill(LinearGradient(
                            colors: [theme.primary, Color(hex: "#FF8E53")],
                            startPoint: .topLeading, endPoint: .bottomTrailing
                        ))
                        .frame(width: 80, height: 80)
                        .shadow(color: theme.primary.opacity(0.55), radius: 28, y: 12)
                    Text("S")
                        .font(.system(size: 40, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                }

                // Greeting
                VStack(spacing: 6) {
                    if firstName.isEmpty {
                        Text("Welcome to Stitch")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(.white)
                    } else {
                        Text("Hi \(firstName)!")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(.white)
                        Text("Welcome to Stitch")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(theme.primary)
                    }
                    Text("Let's set up your profile")
                        .font(.subheadline)
                        .foregroundStyle(Color(hex: "#8E8E93"))
                }

                // Profile photo
                Button { showImagePicker = true } label: {
                    ZStack {
                        if let image = selectedImage {
                            Image(uiImage: image)
                                .resizable().scaledToFill()
                                .frame(width: 90, height: 90)
                                .clipShape(Circle())
                        } else {
                            Circle()
                                .fill(Color(hex: "#2C2C2E"))
                                .frame(width: 90, height: 90)
                            Image(systemName: "person.fill")
                                .font(.system(size: 36))
                                .foregroundStyle(Color(hex: "#636366"))
                        }
                        Circle()
                            .fill(theme.primary)
                            .frame(width: 28, height: 28)
                            .overlay { Image(systemName: "camera.fill").font(.system(size: 12)).foregroundStyle(.white) }
                            .offset(x: 32, y: 32)
                    }
                }
                .buttonStyle(.plain)

                // Name fields (only if not from OAuth)
                if firstName.isEmpty {
                    VStack(spacing: 12) {
                        onboardTextField(icon: "person", placeholder: "First name", text: $editFirstName)
                        onboardTextField(icon: "person", placeholder: "Last name", text: $editLastName)
                    }
                    .padding(.horizontal, 24)
                }

                // Username field
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 0) {
                        Text("@").font(.body.weight(.semibold)).foregroundStyle(Color(hex: "#636366"))
                        TextField("username", text: $username)
                            .font(.body)
                            .foregroundStyle(.white)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .onChange(of: username) { _, newVal in
                                username = newVal.lowercased().replacingOccurrences(of: " ", with: "_")
                                    .filter { $0.isLetter || $0.isNumber || $0 == "_" }
                                checkUsernameAvailability()
                            }
                        if isCheckingUsername {
                            ProgressView().scaleEffect(0.7)
                        } else if let available = usernameAvailable {
                            Image(systemName: available ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .foregroundStyle(available ? .green : .red)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(Color(hex: "#1C1C1E"), in: RoundedRectangle(cornerRadius: 12))

                    if let msg = usernameMessage {
                        Text(msg)
                            .font(.caption)
                            .foregroundStyle(usernameAvailable == true ? .green : .red)
                            .padding(.leading, 4)
                    }
                }
                .padding(.horizontal, 24)

                Spacer().frame(height: 20)

                // Continue button
                AuthPrimaryButton(
                    title: isSavingProfile ? "Setting up..." : "Continue",
                    isLoading: isSavingProfile,
                    disabled: usernameAvailable != true || isSavingProfile
                ) {
                    Task { await saveProfile() }
                }
                .padding(.horizontal, 24)

                Spacer().frame(height: 40)
            }
        }
        .scrollDismissesKeyboard(.interactively)
    }

    private func saveProfile() async {
        isSavingProfile = true
        defer { isSavingProfile = false }

        do {
            // Upload avatar if selected
            if let image = selectedImage, let jpegData = image.jpegData(compressionQuality: 0.8) {
                struct AvatarResponse: Decodable { let avatar_url: String? }
                let _: APIResponse<AvatarResponse> = try await APIClient.shared.uploadImage(
                    "/users/me/avatar", imageData: jpegData
                )
            }

            // Set username
            struct UsernameBody: Encodable { let username: String }
            let _: APIResponse<User> = try await APIClient.shared.patch(
                "/users/me/username", body: UsernameBody(username: username)
            )

            // Update name if provided
            if !editFirstName.isEmpty || !editLastName.isEmpty {
                let displayName = [editFirstName, editLastName].filter { !$0.isEmpty }.joined(separator: " ")
                struct NameBody: Encodable { let display_name: String }
                let _: APIResponse<User> = try await APIClient.shared.patch(
                    "/users/me", body: NameBody(display_name: displayName)
                )
            }

            // Mark onboarding step
            let _: APIResponse<[String: Bool]> = try await APIClient.shared.patch(
                "/onboarding", body: ["profile_setup": true, "welcome_seen": true]
            )

            withAnimation { step = 1 }
        } catch {
            print("[ONBOARDING] Profile save error: \(error)")
        }
    }

    // MARK: - Step 1: Craft + Experience (Combined)

    private var craftExperienceStep: some View {
        VStack(spacing: 0) {
            if showExperiencePicker {
                experienceContent
            } else if showKnittingStylePicker {
                knittingStyleContent
            } else {
                craftContent
            }
        }
    }

    private var craftContent: some View {
        VStack(spacing: 0) {
            skipButton { await skipCraftExperience() }
                .frame(maxWidth: .infinity, alignment: .trailing)
                .padding(.horizontal, 28).padding(.top, 8)

            VStack(spacing: 6) {
                Text("What do you make?")
                    .font(.title2.bold()).foregroundStyle(.white)
                Text("We'll personalise your experience")
                    .font(.subheadline).foregroundStyle(Color(hex: "#8E8E93"))
            }
            .padding(.top, 36).padding(.bottom, 36)

            VStack(spacing: 12) {
                onboardCard(emoji: "🧶", title: "Knitting", subtitle: "Cast on, knit, purl, repeat") { selectCraft(.knitting) }
                onboardCard(emoji: "🪡", title: "Crocheting", subtitle: "Hook, yarn, and create") { selectCraft(.crocheting) }
                onboardCard(emoji: "✨", title: "Both!", subtitle: "I love all fibre arts") { selectCraft(.both) }
            }
            .padding(.horizontal, 24)
            Spacer()
        }
    }

    private func selectCraft(_ pref: CraftPref) {
        craftPref = pref
        UserDefaults.standard.set(pref.rawValue, forKey: "stitch_craft_preference")
        Task {
            let _: APIResponse<[String: Bool]> = try await APIClient.shared.patch(
                "/onboarding", body: ["craft_preference_set": true]
            )
            if pref == .knitting || pref == .both {
                withAnimation { showKnittingStylePicker = true }
            } else {
                withAnimation { showExperiencePicker = true }
            }
        }
    }

    private var knittingStyleContent: some View {
        VStack(spacing: 0) {
            skipButton {
                withAnimation { showKnittingStylePicker = false; showExperiencePicker = true }
            }
            .frame(maxWidth: .infinity, alignment: .trailing)
            .padding(.horizontal, 28).padding(.top, 8)

            VStack(spacing: 6) {
                Text("How do you knit?")
                    .font(.title2.bold()).foregroundStyle(.white)
                Text("This helps us show the right tutorials")
                    .font(.subheadline).foregroundStyle(Color(hex: "#8E8E93"))
            }
            .padding(.top, 36).padding(.bottom, 36)

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
            try? await APIClient.shared.patch("/users/me", body: Body(knitting_style: style)) as APIResponse<[String: Bool]>
            withAnimation { showKnittingStylePicker = false; showExperiencePicker = true }
        }
    }

    private var experienceContent: some View {
        VStack(spacing: 0) {
            skipButton { await skipExperience() }
                .frame(maxWidth: .infinity, alignment: .trailing)
                .padding(.horizontal, 28).padding(.top, 8)

            VStack(spacing: 6) {
                Text("What's your experience?")
                    .font(.title2.bold()).foregroundStyle(.white)
                Text("We'll tailor tutorials and suggestions")
                    .font(.subheadline).foregroundStyle(Color(hex: "#8E8E93"))
            }
            .padding(.top, 36).padding(.bottom, 36)

            VStack(spacing: 12) {
                experienceCard(icon: "leaf", title: "Beginner", subtitle: "Just starting out", level: "beginner")
                experienceCard(icon: "flame", title: "Intermediate", subtitle: "Comfortable with patterns", level: "intermediate")
                experienceCard(icon: "star.fill", title: "Advanced", subtitle: "Experienced with complex projects", level: "advanced")
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
                try? await APIClient.shared.patch("/users/me", body: Body(experience_level: level)) as APIResponse<[String: Bool]>
                try? await APIClient.shared.patch("/onboarding", body: ["experience_level_set": true]) as APIResponse<[String: Bool]>
                withAnimation { showExperiencePicker = false; step = 2 }
            }
        }
    }

    private func skipCraftExperience() async {
        try? await APIClient.shared.patch("/onboarding", body: ["craft_preference_set": true, "experience_level_set": true]) as APIResponse<[String: Bool]>
        withAnimation { step = 2 }
    }

    private func skipExperience() async {
        try? await APIClient.shared.patch("/onboarding", body: ["experience_level_set": true]) as APIResponse<[String: Bool]>
        withAnimation { showExperiencePicker = false; step = 2 }
    }

    // MARK: - Step 2: Connect Ravelry

    private var ravelryStep: some View {
        VStack(spacing: 0) {
            skipButton {
                try? await APIClient.shared.patch("/onboarding", body: ["ravelry_prompted": true]) as APIResponse<[String: Bool]>
                withAnimation { step = 3 }
            }
            .frame(maxWidth: .infinity, alignment: .trailing)
            .padding(.horizontal, 28).padding(.top, 8)

            Spacer()

            VStack(spacing: 28) {
                ZStack {
                    Circle().fill(Color(hex: "#E74C3C").opacity(0.12)).frame(width: 90, height: 90)
                    Text("R").font(.system(size: 42, weight: .bold, design: .rounded)).foregroundStyle(Color(hex: "#E74C3C"))
                }
                VStack(spacing: 10) {
                    Text("Already on Ravelry?")
                        .font(.title2.bold()).foregroundStyle(.white)
                    Text("Import your projects, stash, and queue\nin one tap.")
                        .font(.subheadline).foregroundStyle(Color(hex: "#8E8E93"))
                        .multilineTextAlignment(.center).lineSpacing(4)
                }
                VStack(spacing: 8) {
                    ravelryBenefit(icon: "folder.fill", text: "All your projects")
                    ravelryBenefit(icon: "archivebox.fill", text: "Your yarn stash")
                    ravelryBenefit(icon: "list.bullet", text: "Your queue")
                    ravelryBenefit(icon: "person.2.fill", text: "Find friends on Stitch")
                }
                .padding(.horizontal, 32)
            }

            Spacer()

            VStack(spacing: 12) {
                Button {
                    Task {
                        try? await APIClient.shared.patch("/onboarding", body: ["ravelry_prompted": true]) as APIResponse<[String: Bool]>
                    }
                    showRavelrySafari = true
                } label: {
                    HStack(spacing: 8) {
                        Text("R").font(.system(size: 18, weight: .bold, design: .rounded))
                            .foregroundStyle(.white).frame(width: 26, height: 26)
                            .background(Color(hex: "#E74C3C")).clipShape(Circle())
                        Text("Connect Ravelry").font(.headline).foregroundStyle(.white)
                    }
                    .frame(maxWidth: .infinity).frame(height: 52)
                    .background(Color(hex: "#1C1C1E"))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .strokeBorder(Color(hex: "#E74C3C").opacity(0.5), lineWidth: 1.5))
                }

                Button {
                    Task {
                        try? await APIClient.shared.patch("/onboarding", body: ["ravelry_prompted": true]) as APIResponse<[String: Bool]>
                        withAnimation { step = 3 }
                    }
                } label: {
                    Text("I'll do this later").font(.subheadline).foregroundStyle(Color(hex: "#636366"))
                }
            }
            .padding(.horizontal, 24).padding(.bottom, 52)
        }
        .onChange(of: showRavelrySafari) { _, isShowing in
            if !isShowing { withAnimation { step = 3 } }
        }
    }

    private func ravelryBenefit(icon: String, text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon).font(.system(size: 14)).foregroundStyle(Color(hex: "#E74C3C")).frame(width: 20)
            Text(text).font(.subheadline).foregroundStyle(Color(hex: "#8E8E93"))
            Spacer()
        }
    }

    // MARK: - Step 3: Measurements

    private var measurementsStep: some View {
        OnboardingMeasurementsStep(
            viewModel: measurementsVM,
            onContinue: { withAnimation { step = 4 } },
            onSkip: { withAnimation { step = 4 } }
        )
    }

    // MARK: - Step 4: Done + Tour

    private var doneStep: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: 24) {
                ZStack {
                    Circle()
                        .fill(theme.primary.opacity(doneAppeared ? 0.15 : 0))
                        .frame(width: 110, height: 110)
                        .scaleEffect(doneAppeared ? 1 : 0.4)
                    Image(systemName: "checkmark")
                        .font(.system(size: 48, weight: .bold))
                        .foregroundStyle(theme.primary)
                        .scaleEffect(doneAppeared ? 1 : 0)
                        .opacity(doneAppeared ? 1 : 0)
                }
                .animation(.spring(response: 0.5, dampingFraction: 0.6).delay(0.1), value: doneAppeared)

                VStack(spacing: 8) {
                    Text("You're all set!")
                        .font(.system(size: 28, weight: .bold)).foregroundStyle(.white)
                        .opacity(doneAppeared ? 1 : 0)
                        .animation(.easeOut.delay(0.3), value: doneAppeared)
                    Text("Start tracking your projects,\ndiscover patterns, and more.")
                        .font(.subheadline).foregroundStyle(Color(hex: "#8E8E93"))
                        .multilineTextAlignment(.center).lineSpacing(4)
                        .opacity(doneAppeared ? 1 : 0)
                        .animation(.easeOut.delay(0.5), value: doneAppeared)
                }
            }

            Spacer()

            VStack(spacing: 12) {
                // Tour button (placeholder — tour implementation comes later)
                AuthPrimaryButton(title: "Take a quick tour", isLoading: false, disabled: false) {
                    finishOnboarding()
                }

                Button { finishOnboarding() } label: {
                    Text("Start crafting").font(.subheadline).foregroundStyle(Color(hex: "#636366"))
                }
            }
            .padding(.horizontal, 24).padding(.bottom, 52)
            .opacity(doneAppeared ? 1 : 0)
            .animation(.easeOut.delay(0.7), value: doneAppeared)
        }
        .onAppear { doneAppeared = true }
    }

    private func finishOnboarding() {
        Task {
            try? await APIClient.shared.patch("/onboarding", body: ["tour_offered": true]) as APIResponse<[String: Bool]>
        }
        UserDefaults.standard.set(true, forKey: "stitch_onboarding_done")
        onComplete()
    }

    // MARK: - Shared Components

    private func skipButton(action: @escaping () async -> Void) -> some View {
        Button {
            Task { await action() }
        } label: {
            Text("Skip").font(.subheadline).foregroundStyle(Color(hex: "#636366"))
        }
    }

    private func onboardCard(emoji: String? = nil, icon: String? = nil, title: String, subtitle: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 16) {
                if let emoji {
                    Text(emoji).font(.system(size: 28))
                        .frame(width: 48, height: 48)
                        .background(Color(hex: "#1C1C1E"), in: RoundedRectangle(cornerRadius: 12))
                } else if let icon {
                    Image(systemName: icon)
                        .font(.system(size: 20))
                        .foregroundStyle(theme.primary)
                        .frame(width: 48, height: 48)
                        .background(theme.primary.opacity(0.12), in: RoundedRectangle(cornerRadius: 12))
                }
                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(.headline).foregroundStyle(.white)
                    Text(subtitle).font(.caption).foregroundStyle(Color(hex: "#8E8E93"))
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color(hex: "#3A3A3C"))
            }
            .padding(16)
            .background(Color(hex: "#1C1C1E").opacity(0.6), in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Color(hex: "#2C2C2E"), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private func onboardTextField(icon: String, placeholder: String, text: Binding<String>) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 14)).foregroundStyle(Color(hex: "#636366")).frame(width: 20)
            TextField(placeholder, text: text)
                .font(.body).foregroundStyle(.white)
        }
        .padding(.horizontal, 16).padding(.vertical, 12)
        .background(Color(hex: "#1C1C1E"), in: RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Username Check

    private func checkUsernameAvailability() {
        usernameCheckTask?.cancel()
        usernameAvailable = nil
        usernameMessage = nil

        let input = username
        guard input.count >= 3 else {
            if !input.isEmpty { usernameMessage = "Too short"; usernameAvailable = false }
            return
        }
        guard input.count <= 20 else {
            usernameMessage = "Too long"; usernameAvailable = false
            return
        }

        isCheckingUsername = true
        usernameCheckTask = Task {
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }

            do {
                struct CheckResponse: Decodable { let username: String; let available: Bool; let reason: String? }
                let response: APIResponse<CheckResponse> = try await APIClient.shared.get(
                    "/users/me/username/check?q=\(input)"
                )
                guard !Task.isCancelled else { return }
                await MainActor.run {
                    isCheckingUsername = false
                    usernameAvailable = response.data.available
                    usernameMessage = response.data.available ? "Available!" : response.data.reason
                }
            } catch {
                guard !Task.isCancelled else { return }
                await MainActor.run {
                    isCheckingUsername = false
                    usernameAvailable = false
                    usernameMessage = "Could not check"
                }
            }
        }
    }
}

// MARK: - Craft Preference

enum CraftPref: String {
    case knitting, crocheting, both
}

// MARK: - ImagePicker (shared)

struct ImagePicker: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        picker.allowsEditing = true
        picker.sourceType = .photoLibrary
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    func makeCoordinator() -> Coordinator { Coordinator(self) }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: ImagePicker
        init(_ parent: ImagePicker) { self.parent = parent }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let edited = info[.editedImage] as? UIImage { parent.image = edited }
            else if let original = info[.originalImage] as? UIImage { parent.image = original }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { parent.dismiss() }
    }
}
