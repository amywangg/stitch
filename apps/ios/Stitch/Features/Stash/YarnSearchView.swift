import SwiftUI

// MARK: - ViewModel

@Observable
final class YarnSearchViewModel {
    var query = ""
    var results: [YarnSearchResult] = []
    var isSearching = false
    var isLoadingMore = false
    var hasMore = false
    var currentPage = 1
    var totalResults = 0
    var error: String?
    var addedIds: Set<Int> = []

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
                let response: APIResponse<YarnSearchResponse> = try await APIClient.shared.get(
                    "/yarns/search?q=\(encoded)&page=1&page_size=20"
                )
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
            let response: APIResponse<YarnSearchResponse> = try await APIClient.shared.get(
                "/yarns/search?q=\(encoded)&page=\(nextPage)&page_size=20"
            )
            results.append(contentsOf: response.data.yarns)
            currentPage = nextPage
            hasMore = response.data.paginator.page < response.data.paginator.pageCount
        } catch {
            self.error = error.localizedDescription
        }
    }

    func addToStash(yarn: YarnSearchResult, colorway: String?, skeins: Int) async {
        // Optimistic: mark as added immediately
        addedIds.insert(yarn.ravelryId)

        do {
            let fiberString: String? = yarn.fibers?.map { "\($0.percentage)% \($0.name)" }.joined(separator: ", ")
            let body = AddYarnToStashBody(
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
            struct StashResult: Decodable {}
            let _: APIResponse<StashResult> = try await APIClient.shared.post("/stash", body: body)
        } catch {
            // Revert on failure
            addedIds.remove(yarn.ravelryId)
            self.error = error.localizedDescription
        }
    }
}

private struct AddYarnToStashBody: Encodable {
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

// MARK: - Search View

struct YarnSearchView: View {
    @State private var viewModel = YarnSearchViewModel()
    @State private var selectedYarn: YarnSearchResult?
    @Environment(\.dismiss) private var dismiss

    var onAdded: (() -> Void)?

    var body: some View {
        NavigationStack {
            searchContent
                .overlay { searchOverlay }
                .navigationTitle("Add yarn")
                .navigationBarTitleDisplayMode(.inline)
                .searchable(text: $viewModel.query, prompt: "Search yarns (e.g. Cascade 220)")
                .onSubmit(of: .search) { viewModel.search() }
                .onChange(of: viewModel.query) { _, newValue in
                    if newValue.isEmpty {
                        viewModel.results = []
                        viewModel.totalResults = 0
                    }
                }
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Done") { dismiss() }
                    }
                }
                .sheet(item: $selectedYarn) { yarn in
                    AddToStashSheet(yarn: yarn) { colorway, skeins in
                        Task {
                            await viewModel.addToStash(yarn: yarn, colorway: colorway, skeins: skeins)
                            onAdded?()
                        }
                    }
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
    }

    @ViewBuilder
    private var searchContent: some View {
        if viewModel.results.isEmpty && !viewModel.isSearching {
            if viewModel.query.isEmpty {
                ContentUnavailableView {
                    Label("Search yarn", systemImage: "magnifyingglass")
                } description: {
                    Text("Search Ravelry's yarn database to add to your stash.")
                }
            } else {
                ContentUnavailableView.search(text: viewModel.query)
            }
        } else {
            resultsList
        }
    }

    private var resultsList: some View {
        List {
            ForEach(viewModel.results) { yarn in
                YarnSearchRow(
                    yarn: yarn,
                    isAdded: viewModel.addedIds.contains(yarn.ravelryId)
                ) {
                    selectedYarn = yarn
                }
            }

            if viewModel.hasMore {
                loadMoreRow
            }

            if viewModel.totalResults > 0 {
                Text("\(viewModel.totalResults) results")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .listRowSeparator(.hidden)
            }
        }
        .listStyle(.plain)
    }

    private var loadMoreRow: some View {
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
        .listRowSeparator(.hidden)
    }

    @ViewBuilder
    private var searchOverlay: some View {
        if viewModel.isSearching {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(.ultraThinMaterial)
        }
    }
}

// MARK: - Yarn Search Row

struct YarnSearchRow: View {
    let yarn: YarnSearchResult
    let isAdded: Bool
    let onTap: () -> Void

    var body: some View {
        Button { onTap() } label: { rowContent }
            .buttonStyle(.plain)
    }

    private var rowContent: some View {
        HStack(spacing: 12) {
            yarnPhoto
            yarnDetails
            Spacer()
            statusIcon
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private var yarnPhoto: some View {
        if let photoUrl = yarn.photoUrl, let url = URL(string: photoUrl) {
            AsyncImage(url: url) { image in
                image.resizable().aspectRatio(contentMode: .fill)
            } placeholder: {
                Color(.systemGray5)
            }
            .frame(width: 56, height: 56)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        } else {
            RoundedRectangle(cornerRadius: 8)
                .fill(Color(.systemGray5))
                .frame(width: 56, height: 56)
                .overlay {
                    Image(systemName: "wand.and.rays.inverse")
                        .foregroundStyle(.secondary)
                }
        }
    }

    private var yarnDetails: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(yarn.name)
                .font(.subheadline.weight(.medium))
                .lineLimit(1)
                .foregroundStyle(.primary)

            if let companyName = yarn.companyName, !companyName.isEmpty {
                Text(companyName)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            yarnTags

            if let rating = yarn.rating, (yarn.ratingCount ?? 0) > 0 {
                ratingView(rating: rating, count: yarn.ratingCount ?? 0)
            }
        }
    }

    private var yarnTags: some View {
        HStack(spacing: 6) {
            if let weight = yarn.weight {
                Text(weight.capitalized)
                    .font(.caption2)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color(.systemGray5), in: RoundedRectangle(cornerRadius: 4))
            }
            if let grams = yarn.grams, let yardage = yarn.yardage {
                Text("\(yardage)yd / \(grams)g")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            if let fibers = yarn.fibers, !fibers.isEmpty {
                Text(fibers.map(\.name).joined(separator: ", "))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
    }

    private func ratingView(rating: Double, count: Int) -> some View {
        HStack(spacing: 2) {
            Image(systemName: "star.fill")
                .font(.system(size: 10))
                .foregroundStyle(Color(hex: "#FF6B6B"))
            Text(String(format: "%.1f", rating))
                .font(.caption2)
            Text("(\(count))")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    @ViewBuilder
    private var statusIcon: some View {
        if isAdded {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(Color(hex: "#4ECDC4"))
        } else {
            Image(systemName: "plus.circle")
                .foregroundStyle(Color(hex: "#FF6B6B"))
        }
    }
}

// MARK: - Add to Stash Sheet

struct AddToStashSheet: View {
    let yarn: YarnSearchResult
    let onAdd: (String?, Int) -> Void

    @State private var colorway = ""
    @State private var skeins = 1
    @State private var isAdding = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            formContent
                .navigationTitle("Add to stash")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { dismiss() }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        addButton
                    }
                }
        }
        .presentationDetents([.medium, .large])
    }

    private var formContent: some View {
        Form {
            yarnInfoSection
            yarnSpecsSection
            detailsSection
            fibersSection
            discontinuedSection
        }
    }

    private var yarnInfoSection: some View {
        Section {
            HStack(spacing: 12) {
                yarnImage
                yarnText
            }
            .padding(.vertical, 4)
        }
    }

    @ViewBuilder
    private var yarnImage: some View {
        if let photoUrl = yarn.photoUrl, let url = URL(string: photoUrl) {
            AsyncImage(url: url) { image in
                image.resizable().aspectRatio(contentMode: .fill)
            } placeholder: {
                Color(.systemGray5)
            }
            .frame(width: 60, height: 60)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }

    private var yarnText: some View {
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

    @ViewBuilder
    private var yarnSpecsSection: some View {
        let hasSpecs = yarn.grams != nil || yarn.yardage != nil || yarn.weight != nil
            || yarn.minGauge != nil || yarn.texture != nil
        if hasSpecs {
            Section("Specs") {
                if let weight = yarn.weight {
                    specRow("Weight", value: weight.capitalized)
                }
                if let grams = yarn.grams {
                    specRow("Put-up", value: "\(grams)g per skein")
                }
                if let yardage = yarn.yardage {
                    specRow("Yardage", value: "\(yardage)yd per skein")
                }
                if let minGauge = yarn.minGauge, let maxGauge = yarn.maxGauge,
                   let divisor = yarn.gaugeDivisor {
                    let gaugeStr = minGauge == maxGauge
                        ? "\(Int(minGauge)) sts / \(divisor)in"
                        : "\(Int(minGauge))–\(Int(maxGauge)) sts / \(divisor)in"
                    specRow("Gauge", value: gaugeStr)
                }
                if let texture = yarn.texture {
                    specRow("Texture", value: texture.capitalized)
                }
                if yarn.machineWashable == true {
                    specRow("Care", value: "Machine washable")
                }
            }
        }
    }

    private func specRow(_ label: String, value: String) -> some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
        }
        .font(.subheadline)
    }

    private var detailsSection: some View {
        Section("Details") {
            TextField("Colorway (optional)", text: $colorway)
            Stepper("Skeins: \(skeins)", value: $skeins, in: 1...999)
        }
    }

    @ViewBuilder
    private var fibersSection: some View {
        if let fibers = yarn.fibers, !fibers.isEmpty {
            Section("Fiber content") {
                ForEach(fibers, id: \.name) { fiber in
                    HStack {
                        Text(fiber.name)
                        Spacer()
                        Text("\(fiber.percentage)%")
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var discontinuedSection: some View {
        let isDiscontinued = yarn.discontinued ?? false
        if isDiscontinued {
            Section {
                Label("This yarn has been discontinued", systemImage: "exclamationmark.triangle")
                    .font(.caption)
                    .foregroundStyle(.orange)
            }
        }
    }

    private var addButton: some View {
        Button {
            isAdding = true
            onAdd(colorway.isEmpty ? nil : colorway, skeins)
            dismiss()
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
