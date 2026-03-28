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
    var colorways: [String] = []
    var selectedWeight: String?

    // Curated browse sections
    var popularYarns: [YarnSearchResult] = []
    var topRatedYarns: [YarnSearchResult] = []
    private var didLoadBrowse = false

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

    func loadBrowseSections() async {
        guard !didLoadBrowse else { return }
        didLoadBrowse = true
        async let popular: APIResponse<YarnSearchResponse> = APIClient.shared.get(
            "/yarns/search?q=yarn&sort=best&page_size=10&page=1"
        )
        async let topRated: APIResponse<YarnSearchResponse> = APIClient.shared.get(
            "/yarns/search?q=merino&sort=rating&page_size=10&page=1"
        )
        do {
            let (popRes, ratedRes) = try await (popular, topRated)
            popularYarns = popRes.data.yarns
            topRatedYarns = ratedRes.data.yarns
        } catch {
            // Non-critical
        }
    }

    /// Quick search by brand name
    func searchBrand(_ brand: String) {
        query = brand
        search()
    }

    /// Returns true on success
    func addToStash(yarn: YarnSearchResult, colorway: String?, skeins: Int) async -> Bool {
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
            return true
        } catch {
            addedIds.remove(yarn.ravelryId)
            self.error = error.localizedDescription
            return false
        }
    }

    func loadColorways(yarn: YarnSearchResult) async {
        do {
            let encodedName = yarn.name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? yarn.name
            let response: APIResponse<ColorwaysResponse> = try await APIClient.shared.get(
                "/yarns/\(yarn.ravelryId)/colorways?name=\(encodedName)"
            )
            colorways = response.data.colorways
        } catch {
            colorways = []
        }
    }
}

private struct ColorwaysResponse: Decodable {
    let colorways: [String]
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

// MARK: - Weight Categories

private struct YarnWeightCategory: Identifiable {
    let id: String
    let name: String
    let icon: String
    let description: String
}

private let yarnWeights: [YarnWeightCategory] = [
    .init(id: "lace", name: "Lace", icon: "wind", description: "0–1"),
    .init(id: "fingering", name: "Fingering", icon: "leaf", description: "1"),
    .init(id: "sport", name: "Sport", icon: "figure.walk", description: "2"),
    .init(id: "dk", name: "DK", icon: "circle.grid.2x1", description: "3"),
    .init(id: "worsted", name: "Worsted", icon: "circle.grid.2x2", description: "4"),
    .init(id: "aran", name: "Aran", icon: "square.grid.2x2", description: "4"),
    .init(id: "bulky", name: "Bulky", icon: "circle.grid.3x3", description: "5"),
    .init(id: "super-bulky", name: "Super bulky", icon: "square.grid.3x3", description: "6"),
]

// MARK: - Popular Brands

private struct PopularYarnBrand: Identifiable {
    let id: String
    let name: String
}

private let popularBrands: [PopularYarnBrand] = [
    .init(id: "malabrigo", name: "Malabrigo"),
    .init(id: "cascade", name: "Cascade"),
    .init(id: "madelinetosh", name: "Madelinetosh"),
    .init(id: "knit-picks", name: "Knit Picks"),
    .init(id: "berroco", name: "Berroco"),
    .init(id: "rowan", name: "Rowan"),
    .init(id: "hedgehog-fibres", name: "Hedgehog Fibres"),
    .init(id: "spud-chloe", name: "Spud & Chloë"),
    .init(id: "drops", name: "DROPS"),
    .init(id: "lion-brand", name: "Lion Brand"),
    .init(id: "brooklyn-tweed", name: "Brooklyn Tweed"),
    .init(id: "noro", name: "Noro"),
]

// MARK: - Search View

struct YarnSearchView: View {
    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = YarnSearchViewModel()
    @State private var selectedYarn: YarnSearchResult?
    @Environment(\.dismiss) private var dismiss

    var onAdded: (() -> Void)?

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.results.isEmpty && !viewModel.isSearching {
                    if viewModel.query.isEmpty {
                        browseContent
                    } else {
                        ContentUnavailableView.search(text: viewModel.query)
                    }
                } else {
                    resultsList
                }
            }
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
                    if !viewModel.query.isEmpty {
                        Button {
                            viewModel.query = ""
                            viewModel.results = []
                            viewModel.totalResults = 0
                            viewModel.hasMore = false
                            viewModel.selectedWeight = nil
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "chevron.left")
                                    .font(.caption.weight(.semibold))
                                Text("Browse")
                            }
                        }
                    } else {
                        Button("Done") { dismiss() }
                    }
                }
            }
            .sheet(item: $selectedYarn) { yarn in
                AddToStashSheet(yarn: yarn, colorways: viewModel.colorways) { colorway, skeins in
                    Task {
                        let success = await viewModel.addToStash(yarn: yarn, colorway: colorway, skeins: skeins)
                        if success {
                            onAdded?()
                            dismiss()
                        }
                    }
                }
            }
            .onChange(of: selectedYarn) { _, yarn in
                if let yarn {
                    Task { await viewModel.loadColorways(yarn: yarn) }
                }
            }
            .errorAlert(error: $viewModel.error)
            .task { await viewModel.loadBrowseSections() }
        }
    }

    // MARK: - Browse Content (pre-search)

    private var browseContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Curated carousels
                if !viewModel.popularYarns.isEmpty {
                    yarnCarousel(title: "Most popular", yarns: viewModel.popularYarns)
                }
                if !viewModel.topRatedYarns.isEmpty {
                    yarnCarousel(title: "Top rated", yarns: viewModel.topRatedYarns)
                }

                // Weight filter chips
                VStack(alignment: .leading, spacing: 10) {
                    Text("Browse by weight")
                        .font(.subheadline.weight(.semibold))
                        .padding(.horizontal, 16)

                    LazyVGrid(columns: [
                        GridItem(.flexible(), spacing: 10),
                        GridItem(.flexible(), spacing: 10),
                        GridItem(.flexible(), spacing: 10),
                        GridItem(.flexible(), spacing: 10),
                    ], spacing: 10) {
                        ForEach(yarnWeights) { weight in
                            Button {
                                viewModel.selectedWeight = weight.id
                                viewModel.query = weight.name
                                viewModel.search()
                            } label: {
                                VStack(spacing: 4) {
                                    Image(systemName: weight.icon)
                                        .font(.title3)
                                        .frame(height: 24)
                                    Text(weight.name)
                                        .font(.caption.weight(.medium))
                                    Text("Weight \(weight.description)")
                                        .font(.system(size: 9))
                                        .foregroundStyle(.secondary)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(theme.primary.opacity(0.06), in: RoundedRectangle(cornerRadius: 10))
                                .foregroundStyle(.primary)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16)
                }

                // Popular brands
                VStack(alignment: .leading, spacing: 10) {
                    Text("Popular brands")
                        .font(.subheadline.weight(.semibold))
                        .padding(.horizontal, 16)

                    LazyVGrid(columns: [
                        GridItem(.flexible(), spacing: 10),
                        GridItem(.flexible(), spacing: 10),
                    ], spacing: 10) {
                        ForEach(popularBrands) { brand in
                            Button {
                                viewModel.searchBrand(brand.name)
                            } label: {
                                HStack(spacing: 10) {
                                    brandInitials(brand.name)
                                    Text(brand.name)
                                        .font(.subheadline.weight(.medium))
                                        .lineLimit(1)
                                        .foregroundStyle(.primary)
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.caption2)
                                        .foregroundStyle(.tertiary)
                                }
                                .padding(10)
                                .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 10))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16)
                }
            }
            .padding(.top, 16)
            .padding(.bottom, 32)
        }
    }

    private func brandInitials(_ name: String) -> some View {
        let initials = name.split(separator: " ").prefix(2).map { String($0.prefix(1)) }.joined()
        return RoundedRectangle(cornerRadius: 6)
            .fill(theme.primary.opacity(0.12))
            .frame(width: 32, height: 32)
            .overlay {
                Text(initials.isEmpty ? "?" : initials)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(theme.primary)
            }
    }

    // MARK: - Yarn Carousel

    private func yarnCarousel(title: String, yarns: [YarnSearchResult]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.headline)
                .padding(.horizontal, 16)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(yarns) { yarn in
                        Button { selectedYarn = yarn } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                if let photoUrl = yarn.photoUrl, let url = URL(string: photoUrl) {
                                    AsyncImage(url: url) { image in
                                        image.resizable().scaledToFill()
                                    } placeholder: {
                                        Color(.systemGray5)
                                    }
                                    .frame(width: 130, height: 130)
                                    .clipShape(RoundedRectangle(cornerRadius: 10))
                                } else {
                                    RoundedRectangle(cornerRadius: 10)
                                        .fill(Color(.systemGray5))
                                        .frame(width: 130, height: 130)
                                        .overlay {
                                            Image(systemName: "wand.and.rays.inverse")
                                                .foregroundStyle(.tertiary)
                                        }
                                }

                                Text(yarn.name)
                                    .font(.caption.weight(.medium))
                                    .lineLimit(1)
                                    .frame(width: 130, alignment: .leading)

                                if let company = yarn.companyName {
                                    Text(company)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                        .lineLimit(1)
                                        .frame(width: 130, alignment: .leading)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }

    // MARK: - Results List

    private var resultsList: some View {
        List {
            // Active weight filter chip
            if let weight = viewModel.selectedWeight {
                Section {
                    HStack {
                        Text("Weight: \(weight.capitalized)")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(theme.primary)
                        Spacer()
                        Button {
                            viewModel.selectedWeight = nil
                            viewModel.search()
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.vertical, 2)
                }
            }

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

    @Environment(ThemeManager.self) private var theme
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
                .foregroundStyle(theme.primary)
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
                .foregroundStyle(theme.primary)
        } else {
            Image(systemName: "plus.circle")
                .foregroundStyle(theme.primary)
        }
    }
}

// MARK: - Add to Stash Sheet

struct AddToStashSheet: View {
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

            if !colorways.isEmpty {
                colorwaySuggestions
            }

            Stepper("Skeins: \(skeins)", value: $skeins, in: 1...999)
        }
    }

    @ViewBuilder
    private var colorwaySuggestions: some View {
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
                            .foregroundStyle(
                                colorway == cw
                                    ? theme.primary
                                    : .primary
                            )
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.vertical, 4)
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
