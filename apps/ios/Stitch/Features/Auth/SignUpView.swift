import SwiftUI
import ClerkKit

struct SignUpView: View {
    var onSignIn: () -> Void

    @Environment(ThemeManager.self) private var theme
    @State private var firstName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    // Email verification step
    @State private var pendingSignUp: SignUp?
    @State private var verificationCode = ""
    @State private var isVerifying = false
    @State private var verifyError: String?

    var body: some View {
        ZStack {
            AuthBackground()

            if let pending = pendingSignUp {
                // Step 2: OTP verification
                verificationView(pending: pending)
            } else {
                // Step 1: Sign up form
                signUpForm
            }
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Sign Up Form

    private var signUpForm: some View {
        ScrollView {
            VStack(spacing: 0) {
                AuthLogoHeader()
                    .padding(.top, 52)
                    .padding(.bottom, 28)

                VStack(spacing: 6) {
                    Text("Create your account")
                        .font(.title2.bold())
                        .foregroundStyle(.white)
                    Text("Fill in the details below to get started")
                        .font(.subheadline)
                        .foregroundStyle(Color(hex: "#8E8E93"))
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 32)

                VStack(spacing: 12) {
                    AuthTextField(
                        placeholder: "First name",
                        iconName: "person",
                        text: $firstName,
                        keyboardType: .default
                    )

                    AuthTextField(
                        placeholder: "Enter your email",
                        iconName: "envelope",
                        text: $email,
                        keyboardType: .emailAddress
                    )

                    AuthTextField(
                        placeholder: "Create a password",
                        iconName: "lock",
                        text: $password,
                        isSecure: true
                    )
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 24)

                if let errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundStyle(Color(hex: "#FF453A"))
                        .padding(.horizontal, 24)
                        .padding(.bottom, 12)
                }

                AuthPrimaryButton(title: "Create Account", isLoading: isLoading, disabled: email.isEmpty || password.isEmpty) {
                    Task { await signUp() }
                }
                .padding(.horizontal, 24)

                AuthDivider()
                    .padding(.vertical, 24)
                    .padding(.horizontal, 24)

                HStack(spacing: 12) {
                    AuthSocialButton(title: "Google", icon: .google) {
                        Task { await signUpWithGoogle() }
                    }
                    AuthSocialButton(title: "Apple", icon: .apple) {
                        Task { await signUpWithApple() }
                    }
                }
                .padding(.horizontal, 24)

                Spacer(minLength: 40)

                HStack(spacing: 4) {
                    Text("Already have an account?")
                        .foregroundStyle(Color(hex: "#8E8E93"))
                    Button("Sign in") { onSignIn() }
                        .foregroundStyle(theme.primary)
                        .fontWeight(.semibold)
                }
                .font(.subheadline)
                .padding(.bottom, 40)
            }
        }
        .scrollBounceBehavior(.basedOnSize)
    }

    // MARK: - Verification Screen

    private func verificationView(pending: SignUp) -> some View {
        ScrollView {
            VStack(spacing: 0) {
                AuthLogoHeader()
                    .padding(.top, 52)
                    .padding(.bottom, 28)

                VStack(spacing: 8) {
                    Image(systemName: "envelope.badge.shield.half.filled")
                        .font(.system(size: 40))
                        .foregroundStyle(theme.primary)
                        .padding(.bottom, 8)

                    Text("Verify your email")
                        .font(.title2.bold())
                        .foregroundStyle(.white)

                    Text("We sent a 6-digit code to\n\(email)")
                        .font(.subheadline)
                        .foregroundStyle(Color(hex: "#8E8E93"))
                        .multilineTextAlignment(.center)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 36)

                // Code field
                VStack(spacing: 12) {
                    AuthTextField(
                        placeholder: "Enter 6-digit code",
                        iconName: "number",
                        text: $verificationCode,
                        keyboardType: .numberPad
                    )
                    .padding(.horizontal, 24)

                    if let verifyError {
                        Text(verifyError)
                            .font(.caption)
                            .foregroundStyle(Color(hex: "#FF453A"))
                            .padding(.horizontal, 24)
                    }
                }
                .padding(.bottom, 24)

                AuthPrimaryButton(title: "Verify Email", isLoading: isVerifying, disabled: verificationCode.count < 6) {
                    Task { await verify(pending: pending) }
                }
                .padding(.horizontal, 24)

                Button {
                    Task {
                        _ = try? await pending.sendEmailCode()
                    }
                } label: {
                    Text("Resend code")
                        .font(.subheadline)
                        .foregroundStyle(theme.primary)
                }
                .padding(.top, 20)

                Button {
                    pendingSignUp = nil
                    verificationCode = ""
                    verifyError = nil
                } label: {
                    Text("← Back")
                        .font(.subheadline)
                        .foregroundStyle(Color(hex: "#8E8E93"))
                }
                .padding(.top, 12)
            }
        }
        .scrollBounceBehavior(.basedOnSize)
    }

    // MARK: - Actions

    private func signUp() async {
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil
        do {
            let signUp = try await Clerk.shared.auth.signUp(
                emailAddress: email,
                password: password,
                firstName: firstName.isEmpty ? nil : firstName
            )
            if signUp.status == .complete {
                // Session is active — clerk.user will become non-nil automatically
            } else {
                // Requires email verification
                let updated = try await signUp.sendEmailCode()
                pendingSignUp = updated
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func verify(pending: SignUp) async {
        isVerifying = true
        defer { isVerifying = false }
        verifyError = nil
        do {
            try await pending.verifyEmailCode(verificationCode)
            // clerk.user will become non-nil automatically via @Observable
        } catch {
            verifyError = error.localizedDescription
        }
    }

    private func signUpWithGoogle() async {
        errorMessage = nil
        do {
            try await Clerk.shared.auth.signUpWithOAuth(provider: .google)
            print("[AUTH] Google sign-up completed, user: \(Clerk.shared.user?.id ?? "nil")")
        } catch {
            print("[AUTH] Google sign-up failed, trying sign-in: \(error)")
            do {
                try await Clerk.shared.auth.signInWithOAuth(provider: .google)
                print("[AUTH] Google sign-in completed, user: \(Clerk.shared.user?.id ?? "nil")")
            } catch {
                print("[AUTH] Google sign-in also failed: \(error)")
                errorMessage = error.localizedDescription
            }
        }
    }

    private func signUpWithApple() async {
        errorMessage = nil
        do {
            try await Clerk.shared.auth.signUpWithApple()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
