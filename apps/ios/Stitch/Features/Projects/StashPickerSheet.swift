import SwiftUI

// MARK: - Stash Picker Tab

private enum StashPickerTab: String, CaseIterable {
    case myStash
    case search

    var label: String {
        switch self {
        case .myStash: return "My stash"
        case .search: return "Search"
        }
    }
}

// MARK: - ViewModel

@Observable
final class StashPickerViewModel {
    var items: [StashItem] = []
    var isLoading = false
    var searchText = ""

    var filtered: [StashItem] {
        guard !searchText.isEmpty else { return items }
        let q = searchText.lowercased()
        return items.filter { item in
            let name = item.yarn?.name.lowercased() ?? ""
            let company = item.yarn?.company?.name.lowercased() ?? ""
            let colorway = item.colorway?.lowercased() ?? ""
            return name.contains(q) || company.contains(q) || colorway.contains(q)
        }
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<PaginatedData<StashItem>> = try await APIClient.shared.get(
                "/stash?limit=200&status=in_stash"
            )
            items = response.data.items
        } catch {
            // Non-critical
        }
    }
}

// MARK: - Search & Add ViewModel

@Observable
final class StashSearchAddViewModel {
    var query = ""
    var results: [YarnSearchResult] = []
    var isSearching = false
    var isLoadingMore = false
    var hasMore = false
    var currentPage = 1
    var totalResults = 0
    var error: String?
    var addedIds: Set<Int> = []
    var colorways: [String] = []
    var selectedWeight: String?
    var isAdding = false

    private var searchTask: Task<Void, Never>?

    func search() {
        searchTask?.cancel()
        guard !query.trimmingCharacters(in: .whitespaces).isEmpty else {
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
                let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
                var path = "/yarns/search?q=\(encoded)&page=1&page_size=20"
                if let weight = selectedWeight {
                    path += "&weight=\(weight)"
                }
                let response: APIResponse<YarnSearchResponse> = try await APIClient.shared.get(path)
                guard !Task.isCancelled else { return }
                results = response.data.yarns
                totalResults = response.data.paginator.results
                hasMore = response.data.paginator.page < response.data.paginator.pageCount
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
            let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
            var path = "/yarns/search?q=\(encoded)&page=\(nextPage)&page_size=20"
            if let weight = selectedWeight {
                path += "&weight=\(weight)"
            }
            let response: APIResponse<YarnSearchResponse> = try await APIClient.shared.get(path)
            results.append(contentsOf: response.data.yarns)
            currentPage = nextPage
            hasMore = response.data.paginator.page < response.data.paginator.pageCount
        } catch {
            self.error = error.localizedDescription
        }
    }

    func loadColorways(yarn: YarnSearchResult) async {
        do {
            let encodedName = yarn.name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? yarn.name
            let response: APIResponse<StashColorwaysResponse> = try await APIClient.shared.get(
                "/yarns/\(yarn.ravelryId)/colorways?name=\(encodedName)"
            )
            colorways = response.data.colorways
        } catch {
            colorways = []
        }
    }

    /// Adds yarn to stash and returns the new stash item ID, or nil on failure.
    func addToStashAndReturn(yarn: YarnSearchResult, colorway: String?, skeins: Int) async -> String? {
        isAdding = true
        defer { isAdding = false }
        addedIds.insert(yarn.ravelryId)

        do {
            let fiberString: String? = yarn.fibers?.map { "\($0.percentage)% \($0.name)" }.joined(separator: ", ")
            let body = StashSearchAddBody(
                ravelry_yarn: .init(
                    ravelry_id: yarn.ravelryId,
                    name: yarn.name,
                    company_name: yarn.companyName ?? "",
                    weight: yarn.weight,
                    yardage: yarn.yardage,
                    grams: yarn.grams,
                    photo_url: yarn.photoUrl,
                    fiber_content: fiberString
                ),
                colorway: colorway?.isEmpty == true ? nil : colorway,
                skeins: skeins
            )
            let response: APIResponse<StashItem> = try await APIClient.shared.post("/stash", body: body)
            return response.data.id
        } catch {
            addedIds.remove(yarn.ravelryId)
            self.error = error.localizedDescription
            return nil
        }
    }
}

private struct StashColorwaysResponse: Decodable {
    let colorways: [String]
}

private struct StashSearchAddBody: Encodable {
    let ravelry_yarn: RavelryYarnBody
    let colorway: String?
    let skeins: Int

    struct RavelryYarnBody: Encodable {
        let ravelry_id: Int
        let name: String
        let company_name: String
        let weight: String?
        let yardage: Int?
        let grams: Int?
        let photo_url: String?
        let fiber_content: String?
    }
}

// MARK: - StashPickerSheet

struct StashPickerSheet: View {
    let onSelect: (String) -> Void
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = StashPickerViewModel()
    @State private var selectedTab: StashPickerTab = .myStash
    @State private var searchVM = StashSearchAddViewModel()
    @State private var selectedYarn: YarnSearchResult?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Tab picker
                tabPicker
                    .padding(.horizontal, 16)
                    .padding(.top, 8)

                // Tab content
                switch selectedTab {
                case .myStash:
                    stashContent
                case .search:
                    searchContent
                }
            }
            .navigationTitle("Add yarn")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .task { await viewModel.load() }
        .sheet(item: $selectedYarn) { yarn in
            AddToStashAndSelectSheet(
                yarn: yarn,
                colorways: searchVM.colorways
            ) { colorway, skeins in
                Task {
                    if let stashId = await searchVM.addToStashAndReturn(yarn: yarn, colorway: colorway, skeins: skeins) {
                        onSelect(stashId)
                        dismiss()
                    }
                }
            }
        }
        .onChange(of: selectedYarn) { _, yarn in
            if let yarn {
                Task { await searchVM.loadColorways(yarn: yarn) }
            }
        }
        .errorAlert(error: $searchVM.error)
    }

    // MARK: - Tab Picker

    private var tabPicker: some View {
        HStack(spacing: 0) {
            ForEach(StashPickerTab.allCases, id: \.self) { tab in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { selectedTab = tab }
                } label: {
                    VStack(spacing: 6) {
                        Text(tab.label)
                            .font(.subheadline.weight(selectedTab == tab ? .semibold : .regular))
                            .foregroundStyle(selectedTab == tab ? .primary : .secondary)
                        Rectangle()
                            .fill(selectedTab == tab ? theme.primary : .clear)
                            .frame(height: 2)
                    }
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity)
            }
        }
    }

    // MARK: - Stash Content

    @ViewBuilder
    private var stashContent: some View {
        if viewModel.isLoading {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if viewModel.items.isEmpty {
            VStack(spacing: 16) {
                ContentUnavailableView(
                    "No yarn in stash",
                    systemImage: "tray",
                    description: Text("Search for yarn to add to your stash and project.")
                )
                Button {
                    withAnimation { selectedTab = .search }
                } label: {
                    Label("Search yarn", systemImage: "magnifyingglass")
                        .font(.subheadline.weight(.medium))
                }
                .buttonStyle(.borderedProminent)
                .tint(theme.primary)
            }
        } else {
            List(viewModel.filtered) { item in
                Button {
                    onSelect(item.id)
                    dismiss()
                } label: {
                    stashItemRow(item)
                }
                .buttonStyle(.plain)
            }
            .searchable(text: $viewModel.searchText, prompt: "Search stash")
        }
    }

    private func stashItemRow(_ item: StashItem) -> some View {
        HStack(spacing: 12) {
            if let url = item.yarn?.imageUrl ?? item.photoUrl,
               let imageUrl = URL(string: url) {
                AsyncImage(url: imageUrl) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color(.systemGray5)
                }
                .frame(width: 44, height: 44)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            } else {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color(.systemGray5))
                    .frame(width: 44, height: 44)
                    .overlay {
                        Image(systemName: "wand.and.rays.inverse")
                            .foregroundStyle(.tertiary)
                    }
            }

            VStack(alignment: .leading, spacing: 2) {
                if let company = item.yarn?.company?.name {
                    Text(company)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Text(item.yarn?.name ?? "Unknown")
                    .font(.subheadline.weight(.medium))
                HStack(spacing: 8) {
                    if let cw = item.colorway {
                        Text(cw)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    if let weight = item.yarn?.weight {
                        Text(weight.capitalized)
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                }
            }
            Spacer()
            Text("\(String(format: "%.0f", item.skeins)) sk")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Search Content

    @ViewBuilder
    private var searchContent: some View {
        VStack(spacing: 0) {
            // Search bar
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                TextField("Search yarns (e.g. Cascade 220)", text: $searchVM.query)
                    .textFieldStyle(.plain)
                    .submitLabel(.search)
                    .onSubmit { searchVM.search() }

                if !searchVM.query.isEmpty {
                    Button {
                        searchVM.query = ""
                        searchVM.results = []
                        searchVM.totalResults = 0
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 10))
            .padding(.horizontal, 16)
            .padding(.vertical, 8)

            // Results
            if searchVM.isSearching {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if searchVM.results.isEmpty {
                if searchVM.query.isEmpty {
                    searchBrowseHint
                } else {
                    ContentUnavailableView.search(text: searchVM.query)
                }
            } else {
                searchResultsList
            }
        }
    }

    private var searchBrowseHint: some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: "magnifyingglass")
                .font(.system(size: 36))
                .foregroundStyle(.tertiary)
            Text("Search Ravelry's yarn database")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Text("The yarn will be added to your stash and linked to the project.")
                .font(.caption)
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            Spacer()
        }
    }

    private var searchResultsList: some View {
        List {
            ForEach(searchVM.results) { yarn in
                YarnSearchRow(
                    yarn: yarn,
                    isAdded: searchVM.addedIds.contains(yarn.ravelryId)
                ) {
                    selectedYarn = yarn
                }
            }

            if searchVM.hasMore {
                HStack {
                    Spacer()
                    if searchVM.isLoadingMore {
                        ProgressView().controlSize(.small)
                    } else {
                        Button("Load more") {
                            Task { await searchVM.loadMore() }
                        }
                        .font(.subheadline)
                    }
                    Spacer()
                }
                .listRowSeparator(.hidden)
            }

            if searchVM.totalResults > 0 {
                Text("\(searchVM.totalResults) results")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .listRowSeparator(.hidden)
            }
        }
        .listStyle(.plain)
    }
}

// MARK: - Add to Stash & Select Sheet

/// Variant of AddToStashSheet that's used within StashPickerSheet.
/// Adds yarn to stash and returns the stash item ID to the picker.
private struct AddToStashAndSelectSheet: View {
    let yarn: YarnSearchResult
    let colorways: [String]
    let onAdd: (String?, Int) -> Void

    @Environment(ThemeManager.self) private var theme
    @State private var colorway = ""
    @State private var skeins = 1
    @State private var isAdding = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                // Yarn info
                Section {
                    HStack(spacing: 12) {
                        if let photoUrl = yarn.photoUrl, let url = URL(string: photoUrl) {
                            AsyncImage(url: url) { image in
                                image.resizable().aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Color(.systemGray5)
                            }
                            .frame(width: 60, height: 60)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            Text(yarn.name)
                                .font(.headline)
                            if let companyName = yarn.companyName, !companyName.isEmpty {
                                Text(companyName)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                            if let weight = yarn.weight {
                                Text(weight.capitalized)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }

                // Details
                Section("Details") {
                    TextField("Colorway (optional)", text: $colorway)

                    if !colorways.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Popular colorways")
                                .font(.caption)
                                .foregroundStyle(.secondary)

                            FlowLayout(spacing: 8) {
                                ForEach(colorways.prefix(10), id: \.self) { cw in
                                    Button {
                                        colorway = cw
                                    } label: {
                                        Text(cw)
                                            .font(.caption)
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 5)
                                            .background(
                                                colorway == cw
                                                    ? theme.primary.opacity(0.15)
                                                    : Color(.systemGray5)
                                            )
                                            .foregroundStyle(colorway == cw ? theme.primary : .primary)
                                            .clipShape(Capsule())
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }

                    Stepper("Skeins: \(skeins)", value: $skeins, in: 1...999)
                }

                // Info banner
                Section {
                    Label("This will add the yarn to your stash and link it to the project.", systemImage: "info.circle")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Add to stash & project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        isAdding = true
                        onAdd(colorway.isEmpty ? nil : colorway, skeins)
                    } label: {
                        if isAdding {
                            ProgressView().controlSize(.small)
                        } else {
                            Text("Add")
                        }
                    }
                    .disabled(isAdding)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}
