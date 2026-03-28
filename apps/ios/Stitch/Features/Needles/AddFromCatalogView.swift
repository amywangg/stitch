import SwiftUI

// MARK: - ViewModel

@Observable
final class AddFromCatalogViewModel {
    var isLoading = false
    var error: String?
    var searchText = ""

    private var allBrands: [ToolBrand] = []

    var brands: [ToolBrand] {
        guard !searchText.isEmpty else { return allBrands }
        let query = searchText.lowercased()
        return allBrands.filter { $0.name.lowercased().contains(query) }
    }

    func loadBrands() async {
        isLoading = true
        defer { isLoading = false }
        do {
            struct BrandsResponse: Decodable { let items: [ToolBrand] }
            let response: APIResponse<BrandsResponse> = try await APIClient.shared.get("/tool-catalog")
            allBrands = response.data.items
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
                        NavigationLink {
                            ToolSetDetailView(setId: brand.id)
                        } label: {
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
        .task {
            await viewModel.loadBrands()
        }
        .sheet(isPresented: $showAILookup) {
            AIToolLookupSheet()
        }
        .errorAlert(error: $viewModel.error)
    }
}

// MARK: - Tool Set Detail (shows items, lets user add to stash)

@Observable
final class ToolSetDetailViewModel {
    var sets: [ToolSet] = []
    var isLoading = false
    var addingSetId: String?
    var addResult: String?
    var error: String?
    var searchText = ""
    var ownedSetIds: Set<String> = []

    private var allSets: [ToolSet] = []

    var filteredSets: [ToolSet] {
        guard !searchText.isEmpty else { return allSets }
        let query = searchText.lowercased()
        return allSets.filter {
            $0.name.lowercased().contains(query) ||
            $0.setType.replacingOccurrences(of: "_", with: " ").lowercased().contains(query)
        }
    }

    func loadSetsForBrand(_ brandId: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            struct SetsResponse: Decodable { let items: [ToolSet] }
            let path = "/tool-catalog/sets?brand_id=\(brandId)&include_items=true"
            let response: APIResponse<SetsResponse> = try await APIClient.shared.get(path)
            allSets = response.data.items
        } catch {
            self.error = error.localizedDescription
        }
    }

    func loadOwnedSets() async {
        do {
            struct NeedlesData: Decodable { let items: [Needle] }
            let response: APIResponse<NeedlesData> = try await APIClient.shared.get("/needles")
            ownedSetIds = Set(response.data.items.compactMap { $0.toolSetId })
        } catch {}
    }

    func addToStash(setId: String) async {
        addingSetId = setId
        defer { addingSetId = nil }
        struct Body: Encodable { let set_id: String }
        do {
            let response: APIResponse<AddSetResult> = try await APIClient.shared.post(
                "/tool-catalog/add-set",
                body: Body(set_id: setId)
            )
            ownedSetIds.insert(setId)
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
    @State private var expandedSets: Set<String> = []

    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach(viewModel.filteredSets) { set in
                        Section {
                        // Header row: thumbnail, info, quick-add, expand chevron
                        HStack(spacing: 10) {
                                // Thumbnail
                                if let imageUrl = set.imageUrl, !imageUrl.isEmpty,
                                   let url = URL(string: imageUrl) {
                                    AsyncImage(url: url) { image in
                                        image.resizable().aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        Color(.systemGray5)
                                    }
                                    .frame(width: 52, height: 52)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                }

                                // Name + meta (tap to expand)
                                Button {
                                    withAnimation(.snappy(duration: 0.3)) {
                                        if expandedSets.contains(set.id) {
                                            expandedSets.remove(set.id)
                                        } else {
                                            expandedSets.insert(set.id)
                                        }
                                    }
                                } label: {
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(set.name)
                                            .font(.subheadline.weight(.semibold))
                                            .foregroundStyle(.primary)
                                            .lineLimit(2)
                                        Text(formatSetType(set.setType))
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                        if let items = set.items {
                                            Text("\(items.count) items")
                                                .font(.caption2)
                                                .foregroundStyle(.secondary)
                                        }
                                    }
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                }
                                .buttonStyle(.plain)

                                // Quick add / owned indicator
                                if viewModel.ownedSetIds.contains(set.id) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.title2)
                                        .foregroundStyle(.green)
                                        .frame(width: 36, height: 36)
                                } else {
                                    Button {
                                        Task { await viewModel.addToStash(setId: set.id) }
                                    } label: {
                                        if viewModel.addingSetId == set.id {
                                            ProgressView()
                                                .controlSize(.small)
                                                .frame(width: 36, height: 36)
                                        } else {
                                            Image(systemName: "plus.circle.fill")
                                                .font(.title2)
                                                .foregroundStyle(theme.primary)
                                                .frame(width: 36, height: 36)
                                        }
                                    }
                                    .buttonStyle(.plain)
                                    .disabled(viewModel.addingSetId != nil)
                                }

                                // Expand chevron
                                Button {
                                    withAnimation(.snappy(duration: 0.3)) {
                                        if expandedSets.contains(set.id) {
                                            expandedSets.remove(set.id)
                                        } else {
                                            expandedSets.insert(set.id)
                                        }
                                    }
                                } label: {
                                    Image(systemName: "chevron.right")
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(.secondary)
                                        .rotationEffect(.degrees(expandedSets.contains(set.id) ? 90 : 0))
                                        .frame(width: 20)
                                }
                                .buttonStyle(.plain)
                            }

                            // Expanded content
                            if expandedSets.contains(set.id) {
                                // Description
                                if let description = set.description {
                                    Text(description)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                        .padding(.vertical, 2)
                                }

                                // Product image (larger when expanded)
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
                            }
                        }
                    }
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("Sets")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $viewModel.searchText, prompt: "Search sets")
        .task {
            async let sets: () = viewModel.loadSetsForBrand(setId)
            async let owned: () = viewModel.loadOwnedSets()
            _ = await (sets, owned)
        }
        .alert("Added", isPresented: .init(
            get: { viewModel.addResult != nil },
            set: { if !$0 { viewModel.addResult = nil } }
        )) {
            Button("OK") { viewModel.addResult = nil }
        } message: {
            Text(viewModel.addResult ?? "")
        }
        .errorAlert(error: $viewModel.error)
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
