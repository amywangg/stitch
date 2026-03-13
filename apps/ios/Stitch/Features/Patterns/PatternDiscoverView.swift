import SwiftUI

// MARK: - ViewModel

@Observable
final class PatternDiscoverViewModel {
    var query = ""
    var results: [DiscoverPattern] = []
    var isSearching = false
    var isLoadingMore = false
    var hasMore = false
    var currentPage = 1
    var totalResults = 0
    var error: String?
    var savedIds: Set<Int> = []

    // Filters
    var craft: String?       // "knitting" | "crochet"
    var category: String?    // "hat", "socks", "sweater", etc.
    var availability: String? // "free"
    var sortBy: String = "best"
    var weight: String?      // yarn weight
    var fit: String?         // "adult", "baby", "child", etc.
    var difficulty: String?  // "1-2", "3", "4-5"
    var designer: String?    // pattern author
    var photosOnly: Bool = false

    private var searchTask: Task<Void, Never>?

    var activeFilterCount: Int {
        var count = 0
        if craft != nil { count += 1 }
        if availability != nil { count += 1 }
        if weight != nil { count += 1 }
        if fit != nil { count += 1 }
        if difficulty != nil { count += 1 }
        if designer != nil { count += 1 }
        if photosOnly { count += 1 }
        return count
    }

    var categories: [(value: String, label: String, icon: String)] {
        [
            ("hat", "Hats", "cloud"),
            ("mittens", "Mittens", "hand.raised"),
            ("socks", "Socks", "shoe"),
            ("sweater", "Sweaters", "tshirt"),
            ("shawl-wrap", "Shawls", "wind"),
            ("scarf", "Scarves", "scribble"),
            ("blanket", "Blankets", "bed.double"),
            ("bag", "Bags", "bag"),
            ("cowl", "Cowls", "circle"),
            ("toy", "Toys", "teddybear"),
        ]
    }

    static let yarnWeights: [(value: String, label: String)] = [
        ("thread", "Thread"),
        ("cobweb", "Cobweb"),
        ("lace", "Lace"),
        ("light fingering", "Light fingering"),
        ("fingering", "Fingering"),
        ("sport", "Sport"),
        ("dk", "DK"),
        ("worsted", "Worsted"),
        ("aran", "Aran"),
        ("bulky", "Bulky"),
        ("super bulky", "Super bulky"),
        ("jumbo", "Jumbo"),
    ]

    static let fitOptions: [(value: String, label: String)] = [
        ("adult", "Adult"),
        ("child", "Child"),
        ("baby", "Baby"),
        ("toddler", "Toddler"),
        ("newborn", "Newborn"),
        ("preemie", "Preemie"),
        ("doll-size", "Doll size"),
    ]

    static let difficultyOptions: [(value: String, label: String)] = [
        ("1", "Beginner (1)"),
        ("1-2", "Beginner–Easy"),
        ("2-3", "Easy–Intermediate"),
        ("3", "Intermediate (3)"),
        ("3-4", "Intermediate–Advanced"),
        ("4-5", "Advanced–Expert"),
    ]

    func search() {
        searchTask?.cancel()
        guard !query.trimmingCharacters(in: .whitespaces).isEmpty || category != nil else {
            results = []
            totalResults = 0
            hasMore = false
            return
        }

        searchTask = Task {
            isSearching = true
            defer { isSearching = false }
            currentPage = 1
            do {
                let response: APIResponse<PatternSearchResponse> = try await APIClient.shared.get(
                    buildSearchURL(page: 1)
                )
                guard !Task.isCancelled else { return }
                results = response.data.patterns
                totalResults = response.data.paginator.results
                hasMore = response.data.paginator.page < response.data.paginator.pageCount
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
            let response: APIResponse<PatternSearchResponse> = try await APIClient.shared.get(
                buildSearchURL(page: nextPage)
            )
            results.append(contentsOf: response.data.patterns)
            currentPage = nextPage
            hasMore = response.data.paginator.page < response.data.paginator.pageCount
        } catch is CancellationError {
            // Ignore
        } catch {
            self.error = error.localizedDescription
        }
    }

    func savePattern(ravelryId: Int) async {
        savedIds.insert(ravelryId)
        struct Body: Encodable { let ravelry_id: Int }
        struct SaveResult: Decodable { let id: String }
        do {
            let _: APIResponse<SaveResult> = try await APIClient.shared.post(
                "/ravelry/patterns/save",
                body: Body(ravelry_id: ravelryId)
            )
        } catch {
            savedIds.remove(ravelryId)
            self.error = error.localizedDescription
        }
    }

    func selectCategory(_ cat: String?) {
        category = (category == cat) ? nil : cat
        search()
    }

    func clearAllFilters() {
        craft = nil
        availability = nil
        weight = nil
        fit = nil
        difficulty = nil
        designer = nil
        photosOnly = false
        search()
    }

    private func buildSearchURL(page: Int) -> String {
        var parts: [String] = []
        if !query.trimmingCharacters(in: .whitespaces).isEmpty {
            let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
            parts.append("query=\(encoded)")
        }
        if let craft { parts.append("craft=\(craft)") }
        if let category { parts.append("pc=\(category)") }
        if let availability { parts.append("availability=\(availability)") }
        if let weight {
            let encoded = weight.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? weight
            parts.append("weight=\(encoded)")
        }
        if let fit { parts.append("fit=\(fit)") }
        if let difficulty { parts.append("diff=\(difficulty)") }
        if let designer {
            let encoded = designer.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? designer
            parts.append("pa=\(encoded)")
        }
        if photosOnly { parts.append("photo=yes") }
        parts.append("sort=\(sortBy)")
        parts.append("page=\(page)")
        parts.append("page_size=20")
        return "/ravelry/search?\(parts.joined(separator: "&"))"
    }
}

// MARK: - Models

struct DiscoverPattern: Codable, Identifiable {
    var id: Int { ravelryId }
    let ravelryId: Int
    let name: String
    let permalink: String?
    let craft: String
    let weight: String?
    let yardageMin: Int?
    let yardageMax: Int?
    let gauge: String?
    let difficulty: Double?
    let rating: Double?
    let photoUrl: String?
    let designer: String?
    let free: Bool
}

struct PatternSearchResponse: Codable {
    let patterns: [DiscoverPattern]
    let paginator: SearchPaginator

    struct SearchPaginator: Codable {
        let results: Int
        let page: Int
        let pageCount: Int
        let pageSize: Int
    }
}

// MARK: - Discover View

struct PatternDiscoverView: View {
    @State private var viewModel = PatternDiscoverViewModel()
    @State private var showFilters = false
    @FocusState private var isSearchFocused: Bool

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 20) {
                searchBar
                categoriesSection
                filtersRow

                if viewModel.isSearching && viewModel.results.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .padding(.top, 60)
                } else if viewModel.results.isEmpty && !viewModel.query.isEmpty {
                    ContentUnavailableView.search(text: viewModel.query)
                } else if viewModel.results.isEmpty {
                    trendingPrompt
                } else {
                    resultsList
                }
            }
            .padding(.bottom, 32)
        }
        .onChange(of: viewModel.query) { _, newValue in
            if newValue.isEmpty && viewModel.category == nil {
                viewModel.results = []
                viewModel.totalResults = 0
            }
        }
        .sheet(isPresented: $showFilters) {
            PatternFilterSheet(viewModel: viewModel)
        }
        .alert("Error", isPresented: .init(
            get: { viewModel.error != nil },
            set: { if !$0 { viewModel.error = nil } }
        )) {
            Button("OK") { viewModel.error = nil }
        } message: {
            Text(viewModel.error ?? "")
        }
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                    .font(.subheadline)
                TextField("Search Ravelry patterns", text: $viewModel.query)
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
                                            ? Color(hex: "#FF6B6B")
                                            : Color(.secondarySystemGroupedBackground)
                                    )
                                    .foregroundStyle(isSelected ? .white : .primary)
                                    .clipShape(RoundedRectangle(cornerRadius: 12))

                                Text(cat.label)
                                    .font(.caption2)
                                    .foregroundStyle(isSelected ? Color(hex: "#FF6B6B") : .secondary)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    // MARK: - Filters Row

    private var filtersRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                // Filter button with badge
                Button { showFilters = true } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "slider.horizontal.3")
                        Text("Filters")
                        if viewModel.activeFilterCount > 0 {
                            Text("\(viewModel.activeFilterCount)")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(width: 18, height: 18)
                                .background(Color(hex: "#FF6B6B"), in: Circle())
                        }
                    }
                    .font(.caption.weight(.medium))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(
                        viewModel.activeFilterCount > 0
                            ? Color(hex: "#FF6B6B").opacity(0.12)
                            : Color(.secondarySystemGroupedBackground)
                    )
                    .foregroundStyle(viewModel.activeFilterCount > 0 ? Color(hex: "#FF6B6B") : .primary)
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)

                // Quick toggles
                filterChip("Knitting", isActive: viewModel.craft == "knitting") {
                    viewModel.craft = viewModel.craft == "knitting" ? nil : "knitting"
                    viewModel.search()
                }
                filterChip("Crochet", isActive: viewModel.craft == "crochet") {
                    viewModel.craft = viewModel.craft == "crochet" ? nil : "crochet"
                    viewModel.search()
                }
                filterChip("Free", isActive: viewModel.availability == "free") {
                    viewModel.availability = viewModel.availability == "free" ? nil : "free"
                    viewModel.search()
                }

                // Active filter pills
                if let weight = viewModel.weight {
                    dismissibleChip(weight.capitalized) {
                        viewModel.weight = nil
                        viewModel.search()
                    }
                }
                if let fit = viewModel.fit {
                    dismissibleChip(fit.capitalized) {
                        viewModel.fit = nil
                        viewModel.search()
                    }
                }
                if viewModel.difficulty != nil {
                    dismissibleChip("Difficulty") {
                        viewModel.difficulty = nil
                        viewModel.search()
                    }
                }

                Divider().frame(height: 20)

                sortMenu
            }
            .padding(.horizontal)
        }
    }

    private var sortMenu: some View {
        Menu {
            Button { viewModel.sortBy = "best"; viewModel.search() } label: {
                Label("Best match", systemImage: viewModel.sortBy == "best" ? "checkmark" : "sparkles")
            }
            Button { viewModel.sortBy = "popularity"; viewModel.search() } label: {
                Label("Popular", systemImage: viewModel.sortBy == "popularity" ? "checkmark" : "flame")
            }
            Button { viewModel.sortBy = "date"; viewModel.search() } label: {
                Label("Newest", systemImage: viewModel.sortBy == "date" ? "checkmark" : "clock")
            }
            Button { viewModel.sortBy = "rating"; viewModel.search() } label: {
                Label("Top rated", systemImage: viewModel.sortBy == "rating" ? "checkmark" : "star")
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

    private func filterChip(_ label: String, isActive: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.caption.weight(.medium))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isActive ? Color(hex: "#FF6B6B") : Color(.secondarySystemGroupedBackground))
                .foregroundStyle(isActive ? .white : .primary)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private func dismissibleChip(_ label: String, onDismiss: @escaping () -> Void) -> some View {
        Button(action: onDismiss) {
            HStack(spacing: 4) {
                Text(label)
                Image(systemName: "xmark")
                    .font(.system(size: 8, weight: .bold))
            }
            .font(.caption.weight(.medium))
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color(hex: "#FF6B6B").opacity(0.12))
            .foregroundStyle(Color(hex: "#FF6B6B"))
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    // MARK: - Trending Prompt

    private var trendingPrompt: some View {
        VStack(spacing: 12) {
            Image(systemName: "sparkle.magnifyingglass")
                .font(.system(size: 40))
                .foregroundStyle(Color(hex: "#FF6B6B").opacity(0.4))
                .padding(.top, 40)

            Text("Search or pick a category")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Text("Browse thousands of patterns from Ravelry")
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
                NavigationLink(value: Route.ravelryPatternDetail(
                    ravelryId: pattern.ravelryId,
                    name: pattern.name,
                    photoUrl: pattern.photoUrl
                )) {
                    DiscoverPatternRow(
                        pattern: pattern,
                        isSaved: viewModel.savedIds.contains(pattern.ravelryId)
                    ) {
                        Task { await viewModel.savePattern(ravelryId: pattern.ravelryId) }
                    }
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

// MARK: - Filter Sheet

private struct PatternFilterSheet: View {
    @Bindable var viewModel: PatternDiscoverViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var designerText = ""

    var body: some View {
        NavigationStack {
            Form {
                // Yarn weight
                Section("Yarn weight") {
                    Picker("Weight", selection: Binding(
                        get: { viewModel.weight ?? "" },
                        set: { viewModel.weight = $0.isEmpty ? nil : $0 }
                    )) {
                        Text("Any").tag("")
                        ForEach(PatternDiscoverViewModel.yarnWeights, id: \.value) { w in
                            Text(w.label).tag(w.value)
                        }
                    }
                    .pickerStyle(.navigationLink)
                }

                // Fit / Size
                Section("Fit / Size") {
                    Picker("Fit", selection: Binding(
                        get: { viewModel.fit ?? "" },
                        set: { viewModel.fit = $0.isEmpty ? nil : $0 }
                    )) {
                        Text("Any").tag("")
                        ForEach(PatternDiscoverViewModel.fitOptions, id: \.value) { f in
                            Text(f.label).tag(f.value)
                        }
                    }
                    .pickerStyle(.navigationLink)
                }

                // Difficulty
                Section("Difficulty") {
                    Picker("Skill level", selection: Binding(
                        get: { viewModel.difficulty ?? "" },
                        set: { viewModel.difficulty = $0.isEmpty ? nil : $0 }
                    )) {
                        Text("Any").tag("")
                        ForEach(PatternDiscoverViewModel.difficultyOptions, id: \.value) { d in
                            Text(d.label).tag(d.value)
                        }
                    }
                    .pickerStyle(.navigationLink)
                }

                // Designer
                Section("Designer") {
                    HStack {
                        TextField("Designer name", text: $designerText)
                            .textInputAutocapitalization(.words)
                            .onSubmit {
                                viewModel.designer = designerText.trimmingCharacters(in: .whitespaces).isEmpty
                                    ? nil
                                    : designerText.trimmingCharacters(in: .whitespaces)
                            }
                        if !designerText.isEmpty {
                            Button {
                                designerText = ""
                                viewModel.designer = nil
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundStyle(.secondary)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                // Other options
                Section {
                    Toggle("With photos only", isOn: $viewModel.photosOnly)
                }

                // Clear all
                if viewModel.activeFilterCount > 0 {
                    Section {
                        Button("Clear all filters", role: .destructive) {
                            designerText = ""
                            viewModel.clearAllFilters()
                            dismiss()
                        }
                    }
                }
            }
            .navigationTitle("Filters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Apply") {
                        // Commit designer text
                        let trimmed = designerText.trimmingCharacters(in: .whitespaces)
                        viewModel.designer = trimmed.isEmpty ? nil : trimmed
                        viewModel.search()
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
            .onAppear {
                designerText = viewModel.designer ?? ""
            }
        }
        .presentationDetents([.medium, .large])
    }
}

// MARK: - Pattern Row

private struct DiscoverPatternRow: View {
    let pattern: DiscoverPattern
    let isSaved: Bool
    let onSave: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            patternCover
            patternInfo
            Spacer(minLength: 0)
            saveButton
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }

    private var patternCover: some View {
        Color.clear
            .frame(width: 56, height: 80)
            .overlay {
                if let photoUrl = pattern.photoUrl, let url = URL(string: photoUrl) {
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
            Text(pattern.name)
                .font(.subheadline.weight(.medium))
                .lineLimit(2)
                .foregroundStyle(.primary)

            if let designer = pattern.designer {
                Text("by \(designer)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 6) {
                if pattern.free {
                    Text("Free")
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(Color(hex: "#4ECDC4"))
                }
                if let weight = pattern.weight {
                    Text(weight.capitalized)
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 1)
                        .background(Color(.systemGray5), in: RoundedRectangle(cornerRadius: 4))
                }
                if let difficulty = pattern.difficulty {
                    HStack(spacing: 2) {
                        Image(systemName: "chart.bar")
                            .font(.system(size: 9))
                        Text(String(format: "%.1f", difficulty))
                            .font(.caption2)
                    }
                    .foregroundStyle(.secondary)
                }
                if let rating = pattern.rating {
                    HStack(spacing: 2) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 9))
                            .foregroundStyle(Color(hex: "#FF6B6B"))
                        Text(String(format: "%.1f", rating))
                            .font(.caption2)
                    }
                }
            }

            if let gauge = pattern.gauge {
                Text(gauge)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .lineLimit(1)
            }
        }
    }

    @ViewBuilder
    private var saveButton: some View {
        if isSaved {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(Color(hex: "#4ECDC4"))
                .font(.title3)
        } else {
            Button {
                onSave()
            } label: {
                Image(systemName: "bookmark")
                    .foregroundStyle(Color(hex: "#FF6B6B"))
                    .font(.title3)
            }
            .buttonStyle(.plain)
        }
    }
}
