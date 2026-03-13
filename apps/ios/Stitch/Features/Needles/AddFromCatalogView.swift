import SwiftUI

// MARK: - ViewModel

@Observable
final class AddFromCatalogViewModel {
    var brands: [ToolBrand] = []
    var sets: [ToolSet] = []
    var isLoading = false
    var error: String?
    var searchText = ""
    var selectedBrandId: String?

    func loadBrands() async {
        isLoading = true
        defer { isLoading = false }
        do {
            struct BrandsResponse: Decodable { let items: [ToolBrand] }
            let response: APIResponse<BrandsResponse> = try await APIClient.shared.get("/tool-catalog")
            brands = response.data.items
        } catch {
            self.error = error.localizedDescription
        }
    }

    func loadSets(brandId: String) async {
        isLoading = true
        defer { isLoading = false }
        selectedBrandId = brandId
        do {
            struct SetsResponse: Decodable { let items: [ToolSet] }
            let response: APIResponse<SetsResponse> = try await APIClient.shared.get(
                "/tool-catalog/sets?brand_id=\(brandId)"
            )
            sets = response.data.items
        } catch {
            self.error = error.localizedDescription
        }
    }

    func searchBrands() async {
        guard !searchText.isEmpty else {
            await loadBrands()
            return
        }
        isLoading = true
        defer { isLoading = false }
        do {
            struct BrandsResponse: Decodable { let items: [ToolBrand] }
            let response: APIResponse<BrandsResponse> = try await APIClient.shared.get(
                "/tool-catalog?search=\(searchText.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? searchText)"
            )
            brands = response.data.items
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - Brand List View

struct AddFromCatalogView: View {
    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = AddFromCatalogViewModel()
    @State private var showAILookup = false

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.brands.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach(viewModel.brands) { brand in
                        NavigationLink(value: Route.toolSetDetail(id: brand.id)) {
                            HStack(spacing: 12) {
                                BrandLogoView(brand: brand)

                                Text(brand.name)
                                    .font(.body)
                                Spacer()
                                if let count = brand.count?.toolSets, count > 0 {
                                    Text("\(count) sets")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }

                    Section {
                        Button {
                            showAILookup = true
                        } label: {
                            Label("Can't find your set?", systemImage: "sparkles")
                                .foregroundStyle(theme.primary)
                        }
                    }
                }
                .listStyle(.insetGrouped)
            }
        }
        .navigationTitle("Add a set")
        .searchable(text: $viewModel.searchText, prompt: "Search brands")
        .onChange(of: viewModel.searchText) { _, _ in
            Task { await viewModel.searchBrands() }
        }
        .task {
            await viewModel.loadBrands()
        }
        .sheet(isPresented: $showAILookup) {
            AIToolLookupSheet()
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

// MARK: - Tool Set Detail (shows items, lets user add to stash)

@Observable
final class ToolSetDetailViewModel {
    var sets: [ToolSet] = []
    var isLoading = false
    var isAdding = false
    var addResult: String?
    var error: String?

    func loadSetsForBrand(_ brandId: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            struct SetsResponse: Decodable { let items: [ToolSet] }
            let response: APIResponse<SetsResponse> = try await APIClient.shared.get(
                "/tool-catalog/sets?brand_id=\(brandId)&include_items=true"
            )
            sets = response.data.items
        } catch {
            self.error = error.localizedDescription
        }
    }

    func addToStash(setId: String) async {
        isAdding = true
        defer { isAdding = false }
        struct Body: Encodable { let set_id: String }
        do {
            let response: APIResponse<AddSetResult> = try await APIClient.shared.post(
                "/tool-catalog/add-set",
                body: Body(set_id: setId)
            )
            addResult = "Added \(response.data.added) items from \(response.data.setName)"
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct ToolSetDetailView: View {
    let setId: String
    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = ToolSetDetailViewModel()

    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach(viewModel.sets) { set in
                        Section {
                            // Product image
                            if let imageUrl = set.imageUrl, !imageUrl.isEmpty,
                               let url = URL(string: imageUrl) {
                                AsyncImage(url: url) { image in
                                    image.resizable().aspectRatio(contentMode: .fit)
                                } placeholder: {
                                    Color(.systemGray5)
                                        .frame(height: 160)
                                }
                                .frame(maxWidth: .infinity)
                                .frame(maxHeight: 200)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                                .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                            }

                            // Set header
                            VStack(alignment: .leading, spacing: 4) {
                                Text(set.name)
                                    .font(.headline)
                                if let description = set.description {
                                    Text(description)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Text(formatSetType(set.setType))
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.vertical, 4)

                            // Items in the set
                            if let items = set.items {
                                ForEach(items) { item in
                                    HStack {
                                        Image(systemName: itemIcon(item.type))
                                            .foregroundStyle(theme.primary)
                                            .frame(width: 24)
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(itemLabel(item))
                                                .font(.subheadline)
                                            if let material = item.material {
                                                Text(material.replacingOccurrences(of: "_", with: " ").capitalized)
                                                    .font(.caption)
                                                    .foregroundStyle(.secondary)
                                            }
                                        }
                                        Spacer()
                                        if item.quantity > 1 {
                                            Text("\u{00D7}\(item.quantity)")
                                                .font(.caption)
                                                .foregroundStyle(.secondary)
                                        }
                                    }
                                }
                            }

                            // Add button
                            Button {
                                Task { await viewModel.addToStash(setId: set.id) }
                            } label: {
                                HStack {
                                    Spacer()
                                    if viewModel.isAdding {
                                        ProgressView()
                                            .controlSize(.small)
                                    } else {
                                        Label("Add all to my stash", systemImage: "plus.circle.fill")
                                    }
                                    Spacer()
                                }
                                .padding(.vertical, 4)
                            }
                            .disabled(viewModel.isAdding)
                        }
                    }
                }
                .listStyle(.insetGrouped)
            }
        }
        .navigationTitle("Sets")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadSetsForBrand(setId)
        }
        .alert("Added", isPresented: .init(
            get: { viewModel.addResult != nil },
            set: { if !$0 { viewModel.addResult = nil } }
        )) {
            Button("OK") { viewModel.addResult = nil }
        } message: {
            Text(viewModel.addResult ?? "")
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

    private func formatSetType(_ type: String) -> String {
        switch type {
        case "interchangeable_knitting": return "Interchangeable knitting set"
        case "interchangeable_crochet": return "Interchangeable crochet set"
        case "straight_set": return "Straight needle set"
        case "dpn_set": return "DPN set"
        case "crochet_hook_set": return "Crochet hook set"
        case "circular_set": return "Circular needle set"
        default: return type
        }
    }

    private func itemIcon(_ type: String) -> String {
        switch type {
        case "interchangeable_tip": return "arrow.left.arrow.right"
        case "interchangeable_cable": return "cable.connector"
        case "circular": return "arrow.triangle.capsulepath"
        case "dpn": return "line.3.horizontal"
        case "crochet_hook": return "pencil.and.outline"
        default: return "line.diagonal"
        }
    }

    private func itemLabel(_ item: ToolSetItem) -> String {
        if item.type == "interchangeable_cable" {
            if let length = item.lengthCm {
                let inches = Double(length) / 2.54
                return "Cable \(length)cm / \(String(format: "%.0f", inches))″"
            }
            return "Cable"
        }
        // Show US size + mm for needles/hooks
        var parts: [String] = []
        if let sizeLabel = item.sizeLabel, !sizeLabel.isEmpty {
            parts.append(sizeLabel)
        }
        let mm = item.sizeMm
        if mm > 0 {
            let mmStr = mm.truncatingRemainder(dividingBy: 1) == 0
                ? String(format: "%.0fmm", mm)
                : String(format: "%.1fmm", mm)
            if parts.isEmpty || !(parts[0].contains("mm")) {
                parts.append(mmStr)
            }
        }
        var label = parts.isEmpty ? "Unknown" : parts.joined(separator: " / ")
        if let length = item.lengthCm {
            let inches = Double(length) / 2.54
            label += " (\(length)cm / \(String(format: "%.0f", inches))″)"
        }
        return label
    }
}

// MARK: - Brand Logo

private struct BrandLogoView: View {
    @Environment(ThemeManager.self) private var theme
    let brand: ToolBrand

    var body: some View {
        if let logoUrl = brand.logoUrl, !logoUrl.isEmpty,
           let url = URL(string: logoUrl), !logoUrl.hasSuffix(".svg") {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().aspectRatio(contentMode: .fit)
                default:
                    initialsPlaceholder
                }
            }
            .frame(width: 40, height: 40)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        } else {
            initialsPlaceholder
        }
    }

    private var initialsPlaceholder: some View {
        let initials = brand.name.split(separator: " ").prefix(2).map { String($0.prefix(1)) }.joined()
        return RoundedRectangle(cornerRadius: 8)
            .fill(theme.primary.opacity(0.12))
            .frame(width: 40, height: 40)
            .overlay {
                Text(initials.isEmpty ? "?" : initials)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(theme.primary)
            }
    }
}
