import SwiftUI

// MARK: - ViewModel

@Observable
final class MarketplaceDetailViewModel {
    var pattern: MarketplacePatternDetail?
    var isLoading = false
    var error: String?

    func load(patternId: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<MarketplacePatternDetail> = try await APIClient.shared.get(
                "/marketplace/\(patternId)"
            )
            pattern = response.data
        } catch is CancellationError {
            // Dismissed
        } catch {
            self.error = error.localizedDescription
        }
    }

    func checkOwnership(patternId: String) async {
        do {
            let response: APIResponse<PatternOwnership> = try await APIClient.shared.get(
                "/marketplace/\(patternId)/ownership"
            )
            if response.data.hasAccess {
                // Reload full detail with sections
                await load(patternId: patternId)
            }
        } catch {
            // Non-critical
        }
    }
}

// MARK: - View

struct MarketplacePatternDetailView: View {
    let patternId: String
    @Environment(ThemeManager.self) private var theme
    @Environment(\.scenePhase) private var scenePhase
    @State private var viewModel = MarketplaceDetailViewModel()
    @State private var showCheckout = false
    @State private var checkoutUrl: URL?
    @State private var isCreatingCheckout = false
    @State private var showWriteReview = false
    @State private var reviewsViewModel: PatternReviewsViewModel?

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.pattern == nil {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let pattern = viewModel.pattern {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        // Cover image
                        if let url = pattern.coverImageUrl, let imageUrl = URL(string: url) {
                            AsyncImage(url: imageUrl) { image in
                                image.resizable().aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Color.secondary.opacity(0.15)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 300)
                            .clipped()
                        }

                        VStack(alignment: .leading, spacing: 16) {
                            // Title + designer
                            VStack(alignment: .leading, spacing: 4) {
                                Text(pattern.title)
                                    .font(.title2.weight(.bold))
                                HStack(spacing: 8) {
                                    AvatarImage(url: pattern.user.avatarUrl, size: 24)
                                    Text(pattern.user.displayName ?? pattern.user.username)
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                }
                            }

                            // Price + rating row
                            HStack {
                                Text(pattern.formattedPrice)
                                    .font(.title3.weight(.bold))
                                    .foregroundStyle(theme.primary)

                                Spacer()

                                if let rating = pattern.rating, let count = pattern.ratingCount, count > 0 {
                                    HStack(spacing: 4) {
                                        StarRatingView(rating: rating, size: 14)
                                        Text("(\(count))")
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }

                            // Description
                            if let description = pattern.description, !description.isEmpty {
                                Text(description)
                                    .font(.body)
                                    .foregroundStyle(.secondary)
                            }

                            // Metadata
                            HStack(spacing: 12) {
                                if let garment = pattern.garmentType {
                                    metadataTag(garment.capitalized, icon: "tshirt")
                                }
                                if let weight = pattern.yarnWeight {
                                    metadataTag(weight, icon: "scalemass")
                                }
                                if let difficulty = pattern.difficulty {
                                    metadataTag(difficulty.capitalized, icon: "chart.bar")
                                }
                            }

                            // Sections (if user has access)
                            if let sections = pattern.sections, !sections.isEmpty {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Sections")
                                        .font(.headline)
                                    ForEach(sections) { section in
                                        HStack {
                                            Text(section.name)
                                                .font(.subheadline)
                                            Spacer()
                                            if let rows = section.rows {
                                                Text("\(rows.count) steps")
                                                    .font(.caption)
                                                    .foregroundStyle(.secondary)
                                            }
                                        }
                                        .padding(10)
                                        .background(Color(.secondarySystemGroupedBackground))
                                        .clipShape(RoundedRectangle(cornerRadius: 8))
                                    }
                                }
                            } else if !pattern.hasAccess {
                                // Content locked
                                VStack(spacing: 12) {
                                    Image(systemName: "lock.fill")
                                        .font(.title2)
                                        .foregroundStyle(.secondary)
                                    Text("Purchase to view full pattern")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 30)
                                .background(Color(.secondarySystemGroupedBackground))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }

                            // Reviews
                            if let reviewsVM = reviewsViewModel {
                                PatternReviewsSection(
                                    viewModel: reviewsVM,
                                    showWriteReview: $showWriteReview
                                )
                            }

                            // Purchase / access button
                            purchaseSection(pattern)
                        }
                        .padding()
                    }
                }
            } else {
                ContentUnavailableView("Pattern not found", systemImage: "storefront")
            }
        }
        .navigationTitle(viewModel.pattern?.title ?? "Pattern")
        .navigationBarTitleDisplayMode(.inline)
        .errorAlert(error: $viewModel.error)
        .task {
            await viewModel.load(patternId: patternId)
            let reviewsVM = PatternReviewsViewModel(patternId: patternId)
            reviewsViewModel = reviewsVM
            await reviewsVM.load()
        }
        .sheet(isPresented: $showCheckout) {
            if let url = checkoutUrl {
                SafariView(url: url)
                    .ignoresSafeArea()
            }
        }
        .sheet(isPresented: $showWriteReview) {
            if let reviewsVM = reviewsViewModel {
                WriteReviewSheet(viewModel: reviewsVM)
            }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active && showCheckout == false {
                // Re-check ownership after returning from Safari checkout
                Task { await viewModel.checkOwnership(patternId: patternId) }
            }
        }
        .onChange(of: showCheckout) { _, isShowing in
            if !isShowing {
                Task { await viewModel.checkOwnership(patternId: patternId) }
            }
        }
    }

    // MARK: - Purchase Section

    @ViewBuilder
    private func purchaseSection(_ pattern: MarketplacePatternDetail) -> some View {
        if pattern.isOwner {
            // Owner sees nothing here — they manage from their own PatternDetailView
            EmptyView()
        } else if pattern.hasAccess {
            // Already purchased or free
            HStack {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.green)
                Text(pattern.isPurchased ? "Purchased" : "Free pattern")
                    .fontWeight(.medium)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color.green.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
        } else {
            // Needs purchase
            Button {
                Task { await startCheckout() }
            } label: {
                HStack {
                    if isCreatingCheckout {
                        ProgressView().controlSize(.small).tint(.white)
                    }
                    Text("Purchase for \(pattern.formattedPrice)")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(theme.primary, in: RoundedRectangle(cornerRadius: 12))
                .foregroundStyle(.white)
            }
            .disabled(isCreatingCheckout)
            .buttonStyle(.plain)

            Text("Opens stitch.app in your browser to complete payment")
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
        }
    }

    private func startCheckout() async {
        isCreatingCheckout = true
        defer { isCreatingCheckout = false }
        do {
            struct EmptyBody: Encodable {}
            let response: APIResponse<CheckoutResponse> = try await APIClient.shared.post(
                "/marketplace/\(patternId)/checkout",
                body: EmptyBody()
            )
            if let url = URL(string: response.data.checkoutUrl) {
                checkoutUrl = url
                showCheckout = true
            }
        } catch {
            viewModel.error = error.localizedDescription
        }
    }

    private func metadataTag(_ label: String, icon: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption2)
            Text(label)
                .font(.caption)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color.secondary.opacity(0.1), in: Capsule())
    }
}
