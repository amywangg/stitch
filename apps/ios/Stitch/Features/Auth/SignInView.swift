import SwiftUI
import ClerkKit

struct SignInView: View {
    var onSignUp: () -> Void

    @Environment(ThemeManager.self) private var theme
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showForgotAlert = false

    var body: some View {
        ZStack {
            AuthBackground()

            ScrollView {
                VStack(spacing: 0) {
                    AuthLogoHeader()
                        .padding(.top, 52)
                        .padding(.bottom, 28)

                    // Title
                    VStack(spacing: 6) {
                        Text("Sign in to your account")
                            .font(.title2.bold())
                            .foregroundStyle(.white)
                        Text("Welcome back! Enter your details to continue")
                            .font(.subheadline)
                            .foregroundStyle(Color(hex: "#8E8E93"))
                            .multilineTextAlignment(.center)
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 32)

                    // Form fields
                    VStack(spacing: 12) {
                        AuthTextField(
                            placeholder: "Enter your email",
                            iconName: "envelope",
                            text: $email,
                            keyboardType: .emailAddress
                        )

                        AuthTextField(
                            placeholder: "Enter your password",
                            iconName: "lock",
                            text: $password,
                            isSecure: true
                        )

                        HStack {
                            Spacer()
                            Button("Forgot password?") { showForgotAlert = true }
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(theme.primary)
                        }
                        .padding(.top, 2)
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 24)

                    // Error
                    if let errorMessage {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundStyle(Color(hex: "#FF453A"))
                            .padding(.horizontal, 24)
                            .padding(.bottom, 12)
                    }

                    // Sign In button
                    AuthPrimaryButton(title: "Sign In", isLoading: isLoading, disabled: email.isEmpty || password.isEmpty) {
                        Task { await signIn() }
                    }
                    .padding(.horizontal, 24)

                    AuthDivider()
                        .padding(.vertical, 24)
                        .padding(.horizontal, 24)

                    // Social buttons
                    HStack(spacing: 12) {
                        AuthSocialButton(title: "Google", icon: .google) {
                            Task { await signInWithGoogle() }
                        }
                        AuthSocialButton(title: "Apple", icon: .apple) {
                            Task { await signInWithApple() }
                        }
                    }
                    .padding(.horizontal, 24)

                    Spacer(minLength: 40)

                    // Sign up link
                    HStack(spacing: 4) {
                        Text("Don't have an account?")
                            .foregroundStyle(Color(hex: "#8E8E93"))
                        Button("Sign up") { onSignUp() }
                            .foregroundStyle(theme.primary)
                            .fontWeight(.semibold)
                    }
                    .font(.subheadline)
                    .padding(.bottom, 40)
                }
            }
            .scrollBounceBehavior(.basedOnSize)
        }
        .preferredColorScheme(.dark)
        .alert("Reset Password", isPresented: $showForgotAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Enter your email on the next screen to receive a reset link.")
        }
    }

    private func signIn() async {
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil
        do {
            try await Clerk.shared.auth.signInWithPassword(identifier: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func signInWithGoogle() async {
        errorMessage = nil
        print("[AUTH] === Google OAuth Start ===")

        // Try sign-up first (handles both new and existing users with OAuth)
        do {
            try await Clerk.shared.auth.signUpWithOAuth(provider: .google)
            print("[AUTH] signUpWithOAuth done, user: \(Clerk.shared.user?.id ?? "nil")")
            if Clerk.shared.user != nil { return }
        } catch {
            print("[AUTH] signUpWithOAuth error: \(error)")
        }

        // Fallback: try sign-in
        do {
            try await Clerk.shared.auth.signInWithOAuth(provider: .google)
            print("[AUTH] signInWithOAuth done, user: \(Clerk.shared.user?.id ?? "nil")")
            if Clerk.shared.user != nil { return }
        } catch {
            print("[AUTH] signInWithOAuth error: \(error)")
        }

        // Both failed
        if Clerk.shared.user == nil {
            print("[AUTH] === Both OAuth methods returned nil user ===")
            errorMessage = "Sign in failed. Please try again or use email."
        }
    }

    private func signInWithApple() async {
        errorMessage = nil
        do {
            try await Clerk.shared.auth.signInWithApple()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
