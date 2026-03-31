import SwiftUI
import CoreImage.CIFilterBuiltins

struct ShareProfileView: View {
    let username: String
    let displayName: String?

    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss
    @State private var showCopied = false

    private var profileURL: String { "https://stitch-marker.com/u/\(username)" }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 28) {
                    // Header
                    VStack(spacing: 8) {
                        Image(systemName: "qrcode")
                            .font(.system(size: 36))
                            .foregroundStyle(theme.primary)
                        Text("Share your profile")
                            .font(.title2.bold())
                        Text("Let others scan this QR code to find\nand follow you on Stitch")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 20)

                    // QR Code Card
                    VStack(spacing: 16) {
                        if let qrImage = generateQRCode(from: profileURL) {
                            Image(uiImage: qrImage)
                                .interpolation(.none)
                                .resizable()
                                .scaledToFit()
                                .frame(width: 220, height: 220)
                                .padding(20)
                                .background(.white, in: RoundedRectangle(cornerRadius: 16))
                        }

                        VStack(spacing: 4) {
                            HStack(spacing: 6) {
                                Image(systemName: "person.fill")
                                    .font(.caption)
                                    .foregroundStyle(theme.primary)
                                Text("@\(username)")
                                    .font(.headline)
                            }
                            if let name = displayName, !name.isEmpty {
                                Text(name)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .padding(24)
                    .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 20))
                    .padding(.horizontal, 24)

                    // Action buttons
                    VStack(spacing: 12) {
                        // Share QR code as image
                        ShareLink(item: qrCodeImage, preview: SharePreview("@\(username) on Stitch", image: qrCodeImage)) {
                            HStack(spacing: 8) {
                                Image(systemName: "square.and.arrow.up")
                                Text("Share QR code")
                                    .fontWeight(.semibold)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(theme.primary, in: RoundedRectangle(cornerRadius: 14))
                            .foregroundStyle(.white)
                        }

                        // Copy link
                        Button {
                            UIPasteboard.general.string = profileURL
                            showCopied = true
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { showCopied = false }
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: showCopied ? "checkmark" : "doc.on.doc")
                                Text(showCopied ? "Copied!" : "Copy profile link")
                                    .fontWeight(.semibold)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 14))
                            .foregroundStyle(theme.primary)
                        }
                    }
                    .padding(.horizontal, 24)

                    // How it works
                    VStack(alignment: .leading, spacing: 12) {
                        HStack(spacing: 8) {
                            Image(systemName: "lightbulb.fill")
                                .foregroundStyle(.yellow)
                            Text("How it works")
                                .font(.subheadline.weight(.semibold))
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            howItWorksRow(number: "1", text: "Share your QR code or link")
                            howItWorksRow(number: "2", text: "They scan or tap the link")
                            howItWorksRow(number: "3", text: "Instant follow on Stitch")
                        }
                    }
                    .padding(16)
                    .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 14))
                    .padding(.horizontal, 24)

                    Spacer().frame(height: 20)
                }
            }
            .navigationTitle("Share profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    // MARK: - QR Code Generation

    private func generateQRCode(from string: String) -> UIImage? {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        filter.correctionLevel = "M"

        guard let outputImage = filter.outputImage else { return nil }

        // Scale up for crisp rendering
        let scale = 10.0
        let transformed = outputImage.transformed(by: CGAffineTransform(scaleX: scale, y: scale))

        guard let cgImage = context.createCGImage(transformed, from: transformed.extent) else { return nil }
        return UIImage(cgImage: cgImage)
    }

    private var qrCodeImage: Image {
        if let uiImage = generateQRCode(from: profileURL) {
            return Image(uiImage: uiImage)
        }
        return Image(systemName: "qrcode")
    }

    private func howItWorksRow(number: String, text: String) -> some View {
        HStack(spacing: 10) {
            Text(number)
                .font(.caption.weight(.bold))
                .foregroundStyle(.white)
                .frame(width: 22, height: 22)
                .background(Color(.systemGray3), in: Circle())
            Text(text)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}
