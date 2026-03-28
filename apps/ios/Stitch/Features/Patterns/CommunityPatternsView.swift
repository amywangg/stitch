import SwiftUI

// MARK: - ViewModel

@Observable
final class CommunityPatternsViewModel {
    var query = ""
    var results: [CommunityPattern] = []
    var isSearching = false
    var isLoadingMore = false
    var hasMore = false
    var currentPage = 1
    var totalResults = 0
    var error: String?

    var craft: String?
    var category: String?
    var sort: String = "newest"

    private var searchTask: Task<Void, Never>?

    var categories: [(value: String, label: String, icon: String)] {
        [
            ("hat", "Hats", "cloud"),
            ("mittens", "Mittens", "hand.raised"),
            ("socks", "Socks", "shoe"),
            ("sweater", "Sweaters", "tshirt"),
            ("shawl", "Shawls", "wind"),
            ("scarf", "Scarves", "scribble"),
            ("blanket", "Blankets", "bed.double"),
            ("bag", "Bags", "bag"),
            ("cowl", "Cowls", "circle"),
            ("toy", "Toys", "teddybear"),
        ]
    }

    func search() {
        searchTask?.cancel()
        searchTask = Task {
            isSearching = true
            defer { isSearching = false }
            currentPage = 1
            do {
                let response: APIResponse<PaginatedData<CommunityPattern>> = try await APIClient.shared.get(
                    buildURL(page: 1)
                )
                guard !Task.isCancelled else { return }
                results = response.data.items
                totalResults = response.data.total
                hasMore = response.data.hasMore
            } catch is CancellationError {
                // Ignore
            } catch {
                guard !Task.isCancelled else { return }
                self.error = error.localizedDescription
            }
        }
    }

    func loadMore() async {
        guard hasMore, !isLoadingMore else { return }
        isLoadingMore = true
        defer { isLoadingMore = false }
        let nextPage = currentPage + 1
        do {
            let response: APIResponse<PaginatedData<CommunityPattern>> = try await APIClient.shared.get(
                buildURL(page: nextPage)
            )
            results.append(contentsOf: response.data.items)
            currentPage = nextPage
            hasMore = response.data.hasMore
        } catch {
            self.error = error.localizedDescription
        }
    }

    func loadInitial() {
        guard results.isEmpty else { return }
        search()
    }

    func selectCategory(_ cat: String?) {
        category = (category == cat) ? nil : cat
        search()
    }

    private func buildURL(page: Int) -> String {
        var parts: [String] = []
        if !query.trimmingCharacters(in: .whitespaces).isEmpty {
            let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
            parts.append("query=\(encoded)")
        }
        if let craft { parts.append("craft=\(craft)") }
        if let category { parts.append("category=\(category)") }
        parts.append("sort=\(sort)")
        parts.append("page=\(page)")
        parts.append("limit=20")
        return "/patterns/community?\(parts.joined(separator: "&"))"
    }
}

// MARK: - View

struct CommunityPatternsView: View {
    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = CommunityPatternsViewModel()
    @FocusState private var isSearchFocused: Bool

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 20) {
                categoriesSection
                searchBar
                filterChips

                if viewModel.isSearching && viewModel.results.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .padding(.top, 60)
                } else if viewModel.results.isEmpty && !viewModel.query.isEmpty {
                    ContentUnavailableView.search(text: viewModel.query)
                } else if viewModel.results.isEmpty {
                    emptyPrompt
                } else {
                    resultsList
                }
            }
            .padding(.bottom, 32)
        }
        .task { viewModel.loadInitial() }
        .onChange(of: viewModel.query) { _, newValue in
            if newValue.isEmpty && viewModel.category == nil {
                viewModel.results = []
                viewModel.totalResults = 0
            }
        }
        .errorAlert(error: $viewModel.error)
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                    .font(.subheadline)
                TextField("Search community patterns", text: $viewModel.query)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .focused($isSearchFocused)
                    .submitLabel(.search)
                    .onSubmit { viewModel.search() }
                if !viewModel.query.isEmpty {
                    Button {
                        viewModel.query = ""
                        viewModel.results = []
                        viewModel.totalResults = 0
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))

            if isSearchFocused {
                Button("Cancel") {
                    isSearchFocused = false
                    viewModel.query = ""
                    viewModel.results = []
                    viewModel.totalResults = 0
                }
                .font(.subheadline)
                .transition(.move(edge: .trailing).combined(with: .opacity))
            }
        }
        .padding(.horizontal)
        .animation(.easeInOut(duration: 0.2), value: isSearchFocused)
    }

    // MARK: - Categories

    private var categoriesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Browse")
                .font(.headline)
                .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(viewModel.categories, id: \.value) { cat in
                        let isSelected = viewModel.category == cat.value
                        Button {
                            viewModel.selectCategory(cat.value)
                        } label: {
                            VStack(spacing: 6) {
                                Image(systemName: cat.icon)
                                    .font(.title3)
                                    .frame(width: 48, height: 48)
                                    .background(
                                        isSelected
                                            ? theme.primary
                                            : Color(.secondarySystemGroupedBackground)
                                    )
                                    .foregroundStyle(isSelected ? .white : .primary)
                                    .clipShape(RoundedRectangle(cornerRadius: 12))

                                Text(cat.label)
                                    .font(.caption2)
                                    .foregroundStyle(isSelected ? theme.primary : .secondary)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    // MARK: - Filter Chips

    private var filterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                chipButton("Knitting", isActive: viewModel.craft == "knitting") {
                    viewModel.craft = viewModel.craft == "knitting" ? nil : "knitting"
                    viewModel.search()
                }
                chipButton("Crochet", isActive: viewModel.craft == "crochet") {
                    viewModel.craft = viewModel.craft == "crochet" ? nil : "crochet"
                    viewModel.search()
                }

                Divider().frame(height: 20)

                Menu {
                    Button { viewModel.sort = "newest"; viewModel.search() } label: {
                        Label("Newest", systemImage: viewModel.sort == "newest" ? "checkmark" : "clock")
                    }
                    Button { viewModel.sort = "popular"; viewModel.search() } label: {
                        Label("Popular", systemImage: viewModel.sort == "popular" ? "checkmark" : "flame")
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.up.arrow.down")
                        Text("Sort")
                    }
                    .font(.caption.weight(.medium))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(Capsule())
                }
            }
            .padding(.horizontal)
        }
    }

    private func chipButton(_ label: String, isActive: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.caption.weight(.medium))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isActive ? theme.primary : Color(.secondarySystemGroupedBackground))
                .foregroundStyle(isActive ? .white : .primary)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    // MARK: - Empty Prompt

    private var emptyPrompt: some View {
        VStack(spacing: 12) {
            Image(systemName: "person.3")
                .font(.system(size: 40))
                .foregroundStyle(theme.primary.opacity(0.4))
                .padding(.top, 40)

            Text("Patterns shared by the Stitch community")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Text("No shared patterns yet. Be the first!")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Results

    private var resultsList: some View {
        VStack(alignment: .leading, spacing: 0) {
            if viewModel.totalResults > 0 {
                Text("\(viewModel.totalResults) patterns")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)
                    .padding(.bottom, 8)
            }

            ForEach(viewModel.results) { pattern in
                NavigationLink(value: Route.communityPatternDetail(id: pattern.id)) {
                    CommunityPatternRow(pattern: pattern)
                }
                .buttonStyle(.plain)
            }

            if viewModel.hasMore {
                HStack {
                    Spacer()
                    if viewModel.isLoadingMore {
                        ProgressView().controlSize(.small)
                    } else {
                        Button("Load more") {
                            Task { await viewModel.loadMore() }
                        }
                        .font(.subheadline)
                    }
                    Spacer()
                }
                .padding(.vertical, 12)
            }
        }
    }
}

// MARK: - Community Pattern Row

private struct CommunityPatternRow: View {
    @Environment(ThemeManager.self) private var theme
    let pattern: CommunityPattern

    var body: some View {
        HStack(spacing: 12) {
            patternCover
            patternInfo
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }

    private var patternCover: some View {
        Color.clear
            .frame(width: 56, height: 80)
            .overlay {
                if let coverUrl = pattern.coverImageUrl, let url = URL(string: coverUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            coverPlaceholder
                        }
                    }
                } else {
                    coverPlaceholder
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var coverPlaceholder: some View {
        ZStack {
            Color(.systemGray5)
            Image(systemName: "book.closed")
                .foregroundStyle(.quaternary)
        }
    }

    private var patternInfo: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(pattern.title)
                .font(.subheadline.weight(.medium))
                .lineLimit(2)
                .foregroundStyle(.primary)

            if let designer = pattern.designerName {
                Text("by \(designer)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 6) {
                if let garment = pattern.garmentType {
                    Text(garment.capitalized)
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 1)
                        .background(Color(.systemGray5), in: RoundedRectangle(cornerRadius: 4))
                }
                if let difficulty = pattern.difficulty {
                    Text(difficulty.capitalized)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                if let rating = pattern.rating {
                    HStack(spacing: 2) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 9))
                            .foregroundStyle(theme.primary)
                        Text(String(format: "%.1f", rating))
                            .font(.caption2)
                    }
                }
            }

            Text("by @\(pattern.author.username)")
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
    }
}
