import SwiftUI
import SafariServices

// MARK: - ViewModel

@Observable
final class SellPatternViewModel {
    var priceDollars: Double = 5.0
    var isListing = false
    var isCheckingConnect = false
    var connectStatus: ConnectStatus?
    var error: String?
    var didList = false

    let pattern: Pattern

    init(pattern: Pattern) {
        self.pattern = pattern
        if let cents = pattern.priceCents, cents > 0 {
            priceDollars = Double(cents) / 100.0
        }
    }

    var priceCents: Int { Int(round(priceDollars * 100)) }
    var platformFee: Double { priceDollars * 0.12 }
    var youReceive: Double { priceDollars - platformFee }
    var isAlreadyListed: Bool { pattern.isMarketplace == true }

    func checkConnectStatus() async {
        isCheckingConnect = true
        defer { isCheckingConnect = false }
        do {
            let response: APIResponse<ConnectStatus> = try await APIClient.shared.get("/marketplace/connect/status")
            connectStatus = response.data
        } catch is CancellationError {
            // Dismissed
        } catch {
            self.error = error.localizedDescription
        }
    }

    func startConnectOnboarding() async -> URL? {
        do {
            struct EmptyBody: Encodable {}
            let response: APIResponse<ConnectResponse> = try await APIClient.shared.post(
                "/marketplace/connect",
                body: EmptyBody()
            )
            return URL(string: response.data.url)
        } catch {
            self.error = error.localizedDescription
            return nil
        }
    }

    func listForSale() async {
        isListing = true
        defer { isListing = false }
        do {
            let _ = try await APIClient.shared.patch(
                "/patterns/\(pattern.id)",
                body: ["price_cents": priceCents, "is_marketplace": true] as [String: Any]
            )
            didList = true
        } catch {
            self.error = error.localizedDescription
        }
    }

    func unlist() async {
        isListing = true
        defer { isListing = false }
        do {
            let _ = try await APIClient.shared.patch(
                "/patterns/\(pattern.id)",
                body: ["is_marketplace": false] as [String: Any]
            )
            didList = true
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - View

struct SellPatternSheet: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel: SellPatternViewModel
    @State private var showOnboarding = false
    @State private var onboardingUrl: URL?
    @State private var showAgreement = false
    var onUpdate: (() -> Void)?

    init(pattern: Pattern, onUpdate: (() -> Void)? = nil) {
        _viewModel = State(initialValue: SellPatternViewModel(pattern: pattern))
        self.onUpdate = onUpdate
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Pattern preview
                    patternPreview

                    if viewModel.isCheckingConnect {
                        ProgressView("Checking seller status...")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 40)
                    } else if viewModel.connectStatus?.chargesEnabled != true {
                        // Not connected — show onboarding prompt
                        connectPrompt
                    } else if viewModel.isAlreadyListed {
                        // Already listed — show management
                        listedManagement
                    } else {
                        // Connected — show pricing
                        pricingSection
                        feeBreakdown
                        listButton
                    }
                }
                .padding()
            }
            .navigationTitle(viewModel.isAlreadyListed ? "Manage listing" : "Sell pattern")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        if viewModel.didList { onUpdate?() }
                        dismiss()
                    }
                }
            }
            .errorAlert(error: $viewModel.error)
            .task { await viewModel.checkConnectStatus() }
            .onChange(of: viewModel.didList) { _, listed in
                if listed { onUpdate?() }
            }
            .sheet(isPresented: $showOnboarding) {
                if let url = onboardingUrl {
                    SafariView(url: url)
                        .ignoresSafeArea()
                }
            }
            .onChange(of: showOnboarding) { _, isShowing in
                if !isShowing {
                    // Re-check after returning from Safari
                    Task { await viewModel.checkConnectStatus() }
                }
            }
            .sheet(isPresented: $showAgreement) {
                AgreementView(type: "creator")
            }
        }
        .presentationDetents([.large])
    }

    // MARK: - Pattern Preview

    private var patternPreview: some View {
        HStack(spacing: 12) {
            if let url = viewModel.pattern.coverImageUrl, let imageUrl = URL(string: url) {
                AsyncImage(url: imageUrl) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color.secondary.opacity(0.15)
                }
                .frame(width: 60, height: 80)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(viewModel.pattern.title)
                    .font(.subheadline.weight(.semibold))
                if let designer = viewModel.pattern.designerName {
                    Text("by \(designer)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                if let garment = viewModel.pattern.garmentType {
                    Text(garment.capitalized)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }
            Spacer()
        }
        .padding(12)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Connect Prompt

    private var connectPrompt: some View {
        VStack(spacing: 16) {
            Image(systemName: "building.columns")
                .font(.system(size: 40))
                .foregroundStyle(theme.primary)

            Text("Set up payments")
                .font(.title3.weight(.semibold))

            Text("Connect your Stripe account to receive payments from pattern sales. This only takes a couple of minutes.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button {
                Task {
                    if let url = await viewModel.startConnectOnboarding() {
                        onboardingUrl = url
                        showOnboarding = true
                    }
                }
            } label: {
                Text("Set up Stripe")
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(theme.primary, in: RoundedRectangle(cornerRadius: 12))
                    .foregroundStyle(.white)
            }
            .buttonStyle(.plain)

            Button("View seller agreement") { showAgreement = true }
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 20)
    }

    // MARK: - Pricing Section

    private var pricingSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Set your price")
                .font(.headline)

            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("$")
                    .font(.title.weight(.bold))
                    .foregroundStyle(theme.primary)
                Text(String(format: "%.2f", viewModel.priceDollars))
                    .font(.system(size: 40, weight: .bold, design: .rounded))
                    .foregroundStyle(theme.primary)
            }
            .frame(maxWidth: .infinity)

            Slider(value: $viewModel.priceDollars, in: 1...100, step: 0.5)
                .tint(theme.primary)

            HStack {
                Text("$1.00")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                Spacer()
                Text("$100.00")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
    }

    private var feeBreakdown: some View {
        VStack(spacing: 8) {
            feeRow("Pattern price", String(format: "$%.2f", viewModel.priceDollars))
            feeRow("Platform fee (12%)", String(format: "-$%.2f", viewModel.platformFee))
            Divider()
            HStack {
                Text("You receive")
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text(String(format: "$%.2f", viewModel.youReceive))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.green)
            }
            Text("Stripe processing fees (~2.9% + $0.30) are deducted from your payout")
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
        .padding(12)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func feeRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.subheadline).foregroundStyle(.secondary)
            Spacer()
            Text(value).font(.subheadline)
        }
    }

    // MARK: - List Button

    private var listButton: some View {
        VStack(spacing: 12) {
            Button {
                Task { await viewModel.listForSale() }
            } label: {
                HStack {
                    if viewModel.isListing {
                        ProgressView().controlSize(.small).tint(.white)
                    }
                    Text("List for sale")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(theme.primary, in: RoundedRectangle(cornerRadius: 12))
                .foregroundStyle(.white)
            }
            .disabled(viewModel.isListing)
            .buttonStyle(.plain)

            Button("View seller agreement") { showAgreement = true }
                .font(.caption)
                .foregroundStyle(.secondary)

            Text("By listing, you agree to the seller agreement and confirm this is your original work.")
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Listed Management

    private var listedManagement: some View {
        VStack(spacing: 16) {
            HStack(spacing: 8) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.green)
                Text("Listed on marketplace")
                    .font(.subheadline.weight(.medium))
            }

            if let cents = viewModel.pattern.priceCents, cents > 0 {
                Text(String(format: "$%.2f", Double(cents) / 100.0))
                    .font(.title.weight(.bold))
                    .foregroundStyle(theme.primary)
            }

            // Update price
            pricingSection
            feeBreakdown

            HStack(spacing: 12) {
                Button {
                    Task { await viewModel.listForSale() }
                } label: {
                    Text("Update price")
                        .fontWeight(.medium)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(theme.primary, in: RoundedRectangle(cornerRadius: 10))
                        .foregroundStyle(.white)
                }
                .disabled(viewModel.isListing)
                .buttonStyle(.plain)

                Button {
                    Task { await viewModel.unlist() }
                } label: {
                    Text("Remove listing")
                        .fontWeight(.medium)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color(.secondarySystemGroupedBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .foregroundStyle(.red)
                }
                .disabled(viewModel.isListing)
                .buttonStyle(.plain)
            }
        }
    }
}

// MARK: - Agreement View

struct AgreementView: View {
    @Environment(\.dismiss) private var dismiss
    let type: String
    @State private var agreement: Agreement?
    @State private var isLoading = true

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let agreement {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 16) {
                            ForEach(agreement.sections) { section in
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(section.heading)
                                        .font(.subheadline.weight(.semibold))
                                    Text(section.body)
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                        .padding()
                    }
                } else {
                    ContentUnavailableView("Unable to load", systemImage: "doc")
                }
            }
            .navigationTitle(agreement?.title ?? "Agreement")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .task {
                do {
                    let response: APIResponse<Agreement> = try await APIClient.shared.get(
                        "/marketplace/agreements?type=\(type)"
                    )
                    agreement = response.data
                } catch {
                    // Non-critical
                }
                isLoading = false
            }
        }
    }
}
