import SwiftUI

// MARK: - ViewModel

@Observable
final class MarketplaceViewModel {
    var patterns: [MarketplacePattern] = []
    var isLoading = false
    var error: String?
    var total = 0
    var hasMore = false
    var page = 1

    var query = ""
    var craftFilter: String?
    var categoryFilter: String?
    var sortBy = "newest"
    var priceFilter = "all"

    func load() async {
        isLoading = true
        defer { isLoading = false }
        page = 1
        do {
            let response: APIResponse<PaginatedData<MarketplacePattern>> = try await APIClient.shared.get(
                buildUrl()
            )
            patterns = response.data.items
            total = response.data.total
            hasMore = response.data.hasMore
        } catch is CancellationError {
            // View dismissed
        } catch {
            self.error = error.localizedDescription
        }
    }

    func loadMore() async {
        guard hasMore, !isLoading else { return }
        page += 1
        do {
            let response: APIResponse<PaginatedData<MarketplacePattern>> = try await APIClient.shared.get(
                buildUrl()
            )
            patterns.append(contentsOf: response.data.items)
            hasMore = response.data.hasMore
        } catch is CancellationError {
            // View dismissed
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func buildUrl() -> String {
        var params = ["page=\(page)", "limit=20", "sort=\(sortBy)", "price_filter=\(priceFilter)"]
        if !query.isEmpty { params.append("query=\(query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query)") }
        if let craft = craftFilter { params.append("craft=\(craft)") }
        if let cat = categoryFilter { params.append("category=\(cat)") }
        return "/marketplace?\(params.joined(separator: "&"))"
    }
}

// MARK: - View

struct MarketplaceView: View {
    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = MarketplaceViewModel()

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 16) {
                // Search
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.secondary)
                    TextField("Search patterns...", text: $viewModel.query)
                        .textFieldStyle(.plain)
                        .submitLabel(.search)
                        .onSubmit { Task { await viewModel.load() } }
                }
                .padding(10)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .padding(.horizontal)

                // Filter chips
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        filterChip("All", isSelected: viewModel.priceFilter == "all") {
                            viewModel.priceFilter = "all"
                            Task { await viewModel.load() }
                        }
                        filterChip("Free", isSelected: viewModel.priceFilter == "free") {
                            viewModel.priceFilter = "free"
                            Task { await viewModel.load() }
                        }
                        filterChip("Paid", isSelected: viewModel.priceFilter == "paid") {
                            viewModel.priceFilter = "paid"
                            Task { await viewModel.load() }
                        }

                        Divider().frame(height: 20)

                        sortChip("Newest", value: "newest")
                        sortChip("Popular", value: "popular")
                        sortChip("Price ↓", value: "price_high")
                        sortChip("Price ↑", value: "price_low")
                    }
                    .padding(.horizontal)
                }

                // Results
                if viewModel.isLoading && viewModel.patterns.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 60)
                } else if viewModel.patterns.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "storefront")
                            .font(.system(size: 40))
                            .foregroundStyle(.quaternary)
                        Text("No patterns found")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 60)
                } else {
                    LazyVGrid(columns: columns, spacing: 12) {
                        ForEach(viewModel.patterns) { pattern in
                            NavigationLink(value: Route.marketplaceDetail(id: pattern.id)) {
                                MarketplacePatternCard(pattern: pattern)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal)

                    if viewModel.hasMore {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .padding()
                            .task { await viewModel.loadMore() }
                    }
                }
            }
            .padding(.bottom, 40)
        }
        .navigationTitle("Marketplace")
        .task { await viewModel.load() }
        .errorAlert(error: $viewModel.error)
    }

    private func filterChip(_ label: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.caption.weight(isSelected ? .semibold : .regular))
                .foregroundStyle(isSelected ? .white : .primary)
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(
                    isSelected ? AnyShapeStyle(theme.primary) : AnyShapeStyle(Color(.secondarySystemGroupedBackground)),
                    in: Capsule()
                )
        }
        .buttonStyle(.plain)
    }

    private func sortChip(_ label: String, value: String) -> some View {
        Button {
            viewModel.sortBy = value
            Task { await viewModel.load() }
        } label: {
            Text(label)
                .font(.caption.weight(viewModel.sortBy == value ? .semibold : .regular))
                .foregroundStyle(viewModel.sortBy == value ? .white : .primary)
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(
                    viewModel.sortBy == value ? AnyShapeStyle(Color(hex: "#4ECDC4")) : AnyShapeStyle(Color(.secondarySystemGroupedBackground)),
                    in: Capsule()
                )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Pattern Card

struct MarketplacePatternCard: View {
    @Environment(ThemeManager.self) private var theme
    let pattern: MarketplacePattern

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Cover image
            ZStack(alignment: .topTrailing) {
                if let url = pattern.coverImageUrl, let imageUrl = URL(string: url) {
                    AsyncImage(url: imageUrl) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Color.secondary.opacity(0.1)
                    }
                } else {
                    Color.secondary.opacity(0.1)
                        .overlay {
                            Image(systemName: "doc.text")
                                .font(.title2)
                                .foregroundStyle(.quaternary)
                        }
                }
            }
            .frame(height: 160)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(alignment: .topTrailing) {
                // Price badge
                Text(pattern.formattedPrice)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        pattern.isFree ? Color.green : theme.primary,
                        in: Capsule()
                    )
                    .padding(8)
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(pattern.title)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(2)

                Text(pattern.user.displayName ?? pattern.user.username)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                if let rating = pattern.rating, let count = pattern.ratingCount, count > 0 {
                    HStack(spacing: 3) {
                        Image(systemName: "star.fill")
                            .font(.caption2)
                            .foregroundStyle(Color(hex: "#FF6B6B"))
                        Text(String(format: "%.1f", rating))
                            .font(.caption2.weight(.medium))
                        Text("(\(count))")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }
            }
            .padding(.horizontal, 4)
            .padding(.top, 8)
            .padding(.bottom, 4)
        }
    }
}
