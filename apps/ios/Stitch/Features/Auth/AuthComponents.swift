import SwiftUI

// MARK: - Background

struct AuthBackground: View {
    var body: some View {
        ZStack {
            Color(hex: "#0A0A0A").ignoresSafeArea()

            // Coral radial glow at top
            RadialGradient(
                colors: [Color(hex: "#FF6B6B").opacity(0.22), .clear],
                center: UnitPoint(x: 0.5, y: -0.1),
                startRadius: 0,
                endRadius: 380
            )
            .ignoresSafeArea()
        }
    }
}

// MARK: - Logo Header

struct AuthLogoHeader: View {
    var body: some View {
        VStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [Color(hex: "#FF6B6B"), Color(hex: "#FF8E53")],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 68, height: 68)
                    .shadow(color: Color(hex: "#FF6B6B").opacity(0.5), radius: 16, y: 6)

                Text("S")
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
            }

            Text("Stitch")
                .font(.system(size: 26, weight: .bold, design: .rounded))
                .foregroundStyle(Color(hex: "#FF6B6B"))
        }
    }
}

// MARK: - Text Field

struct AuthTextField: View {
    let placeholder: String
    let iconName: String
    @Binding var text: String
    var isSecure: Bool = false
    var keyboardType: UIKeyboardType = .default

    @State private var isRevealed = false

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: iconName)
                .font(.system(size: 16))
                .foregroundStyle(Color(hex: "#636366"))
                .frame(width: 20)

            Group {
                if isSecure && !isRevealed {
                    SecureField(placeholder, text: $text)
                } else {
                    TextField(placeholder, text: $text)
                        .keyboardType(keyboardType)
                }
            }
            .foregroundStyle(.white)
            .tint(Color(hex: "#FF6B6B"))
            .autocorrectionDisabled()
            .textInputAutocapitalization(.never)

            if isSecure {
                Button {
                    isRevealed.toggle()
                } label: {
                    Image(systemName: isRevealed ? "eye" : "eye.slash")
                        .font(.system(size: 16))
                        .foregroundStyle(Color(hex: "#636366"))
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 16)
        .background(Color(hex: "#1C1C1E"))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(Color(hex: "#2C2C2E"), lineWidth: 1)
        )
    }
}

// MARK: - Primary Button

struct AuthPrimaryButton: View {
    let title: String
    let isLoading: Bool
    let disabled: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Group {
                if isLoading {
                    ProgressView().tint(.white)
                } else {
                    Text(title)
                        .font(.headline)
                        .foregroundStyle(.white)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(
                LinearGradient(
                    colors: disabled
                        ? [Color(hex: "#3A3A3C"), Color(hex: "#3A3A3C")]
                        : [Color(hex: "#FF6B6B"), Color(hex: "#FF8E53")],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .disabled(disabled || isLoading)
    }
}

// MARK: - Divider

struct AuthDivider: View {
    var body: some View {
        HStack(spacing: 12) {
            Rectangle()
                .fill(Color(hex: "#2C2C2E"))
                .frame(height: 1)
            Text("or continue with")
                .font(.caption)
                .foregroundStyle(Color(hex: "#636366"))
                .fixedSize()
            Rectangle()
                .fill(Color(hex: "#2C2C2E"))
                .frame(height: 1)
        }
    }
}

// MARK: - Social Button

enum SocialIcon { case google, apple }

struct AuthSocialButton: View {
    let title: String
    let icon: SocialIcon
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                switch icon {
                case .google:
                    // Styled "G" to represent Google
                    ZStack {
                        Circle()
                            .fill(Color.white)
                            .frame(width: 20, height: 20)
                        Text("G")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(Color(hex: "#4285F4"))
                    }
                case .apple:
                    Image(systemName: "apple.logo")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.white)
                }

                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .background(Color(hex: "#1C1C1E"))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(Color(hex: "#2C2C2E"), lineWidth: 1)
            )
        }
    }
}
