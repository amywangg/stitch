import SwiftUI

struct SplashView: View {
    @State private var opacity: Double = 0
    @State private var dotOpacity: [Double] = [0.3, 0.3, 0.3]

    var body: some View {
        ZStack {
            Color(hex: "#0A0A0A").ignoresSafeArea()

            // Soft coral glow behind logo
            RadialGradient(
                colors: [Color(hex: "#FF6B6B").opacity(0.25), .clear],
                center: .center,
                startRadius: 0,
                endRadius: 280
            )
            .ignoresSafeArea()

            VStack {
                Spacer()

                // Logo
                VStack(spacing: 14) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 26, style: .continuous)
                            .fill(
                                LinearGradient(
                                    colors: [Color(hex: "#FF6B6B"), Color(hex: "#FF8E53")],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 84, height: 84)
                            .shadow(color: Color(hex: "#FF6B6B").opacity(0.5), radius: 24, y: 8)

                        Text("S")
                            .font(.system(size: 42, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                    }

                    Text("Stitch")
                        .font(.system(size: 30, weight: .bold, design: .rounded))
                        .foregroundStyle(Color(hex: "#FF6B6B"))
                }
                .opacity(opacity)

                Spacer()

                // Pulsing dots
                VStack(spacing: 10) {
                    HStack(spacing: 7) {
                        ForEach(0..<3, id: \.self) { i in
                            Circle()
                                .fill(Color(hex: "#FF6B6B"))
                                .frame(width: 7, height: 7)
                                .opacity(dotOpacity[i])
                        }
                    }

                    Text("Please wait...")
                        .font(.subheadline)
                        .foregroundStyle(Color(hex: "#8E8E93"))
                }
                .padding(.bottom, 56)
                .opacity(opacity)
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            withAnimation(.easeIn(duration: 0.5)) { opacity = 1 }
            animateDots()
        }
    }

    private func animateDots() {
        for i in 0..<3 {
            withAnimation(
                .easeInOut(duration: 0.5)
                .repeatForever()
                .delay(Double(i) * 0.18)
            ) {
                dotOpacity[i] = 1.0
            }
        }
    }
}
