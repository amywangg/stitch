import SwiftUI

// MARK: - Needle Picker Tab

private enum NeedlePickerTab: String, CaseIterable {
    case myCollection
    case search

    var label: String {
        switch self {
        case .myCollection: return "My collection"
        case .search: return "Search"
        }
    }
}

// MARK: - Collection ViewModel

@Observable
final class NeedlePickerViewModel {
    var needles: [Needle] = []
    var isLoading = false

    private struct NeedlesData: Decodable {
        let items: [Needle]
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<NeedlesData> = try await APIClient.shared.get("/needles")
            needles = response.data.items
        } catch {
            // Non-critical
        }
    }
}

// MARK: - Catalog Search ViewModel

@Observable
final class NeedleCatalogSearchViewModel {
    var searchQuery = ""
    var productLines: [ToolProductLine] = []
    var isSearching = false
    var error: String?
    var typeFilter: String?

    private var searchTask: Task<Void, Never>?

    private struct ProductLinesData: Decodable {
        let items: [ToolProductLine]
    }

    func search() {
        searchTask?.cancel()
        guard !searchQuery.trimmingCharacters(in: .whitespaces).isEmpty || typeFilter != nil else {
            productLines = []
            return
        }

        searchTask = Task {
            isSearching = true
            defer { isSearching = false }
            do {
                var path = "/tool-catalog/product-lines?"
                if !searchQuery.trimmingCharacters(in: .whitespaces).isEmpty {
                    let encoded = searchQuery.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? searchQuery
                    path += "search=\(encoded)&"
                }
                if let type = typeFilter {
                    path += "type=\(type)&"
                }
                let response: APIResponse<ProductLinesData> = try await APIClient.shared.get(path)
                guard !Task.isCancelled else { return }
                productLines = response.data.items
            } catch {
                guard !Task.isCancelled else { return }
                self.error = error.localizedDescription
            }
        }
    }

    /// Creates a needle in the user's collection and returns the ID.
    func addNeedleToCollection(
        type: String, sizeMm: Double, sizeLabel: String?,
        material: String?, brand: String?, lengthCm: Int?
    ) async -> String? {
        do {
            var body: [String: Any] = [
                "type": type,
                "size_mm": sizeMm,
            ]
            if let sizeLabel { body["size_label"] = sizeLabel }
            if let material { body["material"] = material }
            if let brand { body["brand"] = brand }
            if let lengthCm { body["length_cm"] = lengthCm }

            let data = try await APIClient.shared.post("/needles", body: body)
            struct NewNeedle: Decodable { let id: String }
            let response = try JSONDecoder.iso8601.decode(APIResponse<NewNeedle>.self, from: data)
            return response.data.id
        } catch {
            self.error = error.localizedDescription
            return nil
        }
    }
}

// MARK: - Needle Picker Sheet

struct NeedlePickerSheet: View {
    let onSelect: (String) -> Void
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = NeedlePickerViewModel()
    @State private var selectedTab: NeedlePickerTab = .myCollection
    @State private var catalogVM = NeedleCatalogSearchViewModel()

    // Manual entry state
    @State private var showManualEntry = false
    @State private var manualType = "circular"
    @State private var manualSizeMm: Double = 4.0
    @State private var manualMaterial = "metal"
    @State private var isSavingManual = false

    // Catalog add state
    @State private var selectedProductLine: ToolProductLine?
    @State private var selectedSize: ProductLineSize?
    @State private var selectedLength: Int?
    @State private var isAddingFromCatalog = false

    private let needleTypes = [
        ("straight", "Straight"), ("circular", "Circular"),
        ("dpn", "DPN"), ("crochet_hook", "Crochet hook"),
        ("interchangeable_tip", "Interchangeable"),
    ]
    private let commonSizes: [Double] = [
        2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 3.8, 4.0, 4.5,
        5.0, 5.5, 6.0, 6.5, 7.0, 8.0, 9.0, 10.0, 12.0, 15.0,
    ]
    private let materials = [
        ("metal", "Metal"), ("bamboo", "Bamboo"), ("wood", "Wood"),
        ("carbon", "Carbon fiber"), ("plastic", "Plastic"), ("other", "Other"),
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Tab picker
                tabPicker
                    .padding(.horizontal, 16)
                    .padding(.top, 8)

                switch selectedTab {
                case .myCollection:
                    collectionContent
                case .search:
                    catalogSearchContent
                }
            }
            .navigationTitle("Add needle")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .task { await viewModel.load() }
        .sheet(item: $selectedProductLine) { line in
            NeedleSizePickerSheet(
                productLine: line,
                onSelect: { sizeMm, sizeLabel, lengthCm in
                    Task {
                        isAddingFromCatalog = true
                        defer { isAddingFromCatalog = false }
                        if let id = await catalogVM.addNeedleToCollection(
                            type: line.type,
                            sizeMm: sizeMm,
                            sizeLabel: sizeLabel,
                            material: line.material,
                            brand: line.brand?.name,
                            lengthCm: lengthCm
                        ) {
                            onSelect(id)
                            dismiss()
                        }
                    }
                }
            )
        }
        .errorAlert(error: $catalogVM.error)
    }

    // MARK: - Tab Picker

    private var tabPicker: some View {
        HStack(spacing: 0) {
            ForEach(NeedlePickerTab.allCases, id: \.self) { tab in
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

    // MARK: - Collection Content

    @ViewBuilder
    private var collectionContent: some View {
        if viewModel.isLoading {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if viewModel.needles.isEmpty && !showManualEntry {
            VStack(spacing: 16) {
                ContentUnavailableView(
                    "No needles in collection",
                    systemImage: "minus",
                    description: Text("Search the catalog or enter manually.")
                )
                HStack(spacing: 12) {
                    Button {
                        withAnimation { selectedTab = .search }
                    } label: {
                        Label("Search catalog", systemImage: "magnifyingglass")
                            .font(.subheadline.weight(.medium))
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(theme.primary)

                    Button {
                        showManualEntry = true
                    } label: {
                        Text("Enter manually")
                            .font(.subheadline.weight(.medium))
                    }
                    .buttonStyle(.bordered)
                }
            }
        } else {
            List {
                if !viewModel.needles.isEmpty {
                    Section("From your collection") {
                        ForEach(viewModel.needles) { needle in
                            Button {
                                onSelect(needle.id)
                                dismiss()
                            } label: {
                                needleRow(needle)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                if showManualEntry {
                    manualEntrySection
                } else {
                    Section {
                        Button {
                            showManualEntry = true
                        } label: {
                            Label("Enter manually", systemImage: "plus.circle")
                                .foregroundStyle(theme.primary)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Catalog Search Content

    @ViewBuilder
    private var catalogSearchContent: some View {
        VStack(spacing: 0) {
            // Search bar
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                TextField("Search needles (e.g. ChiaoGoo)", text: $catalogVM.searchQuery)
                    .textFieldStyle(.plain)
                    .submitLabel(.search)
                    .onSubmit { catalogVM.search() }

                if !catalogVM.searchQuery.isEmpty {
                    Button {
                        catalogVM.searchQuery = ""
                        catalogVM.productLines = []
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

            // Type filter chips
            typeFilterChips
                .padding(.horizontal, 16)
                .padding(.bottom, 4)

            // Results
            if catalogVM.isSearching {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if catalogVM.productLines.isEmpty {
                if catalogVM.searchQuery.isEmpty && catalogVM.typeFilter == nil {
                    catalogBrowseHint
                } else {
                    ContentUnavailableView.search(text: catalogVM.searchQuery)
                }
            } else {
                catalogResultsList
            }
        }
    }

    private var typeFilterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                filterChip("All", isSelected: catalogVM.typeFilter == nil) {
                    catalogVM.typeFilter = nil
                    catalogVM.search()
                }
                filterChip("Circular", isSelected: catalogVM.typeFilter == "circular") {
                    catalogVM.typeFilter = "circular"
                    catalogVM.search()
                }
                filterChip("Straight", isSelected: catalogVM.typeFilter == "straight") {
                    catalogVM.typeFilter = "straight"
                    catalogVM.search()
                }
                filterChip("DPN", isSelected: catalogVM.typeFilter == "dpn") {
                    catalogVM.typeFilter = "dpn"
                    catalogVM.search()
                }
                filterChip("Hooks", isSelected: catalogVM.typeFilter == "crochet_hook") {
                    catalogVM.typeFilter = "crochet_hook"
                    catalogVM.search()
                }
            }
        }
    }

    private func filterChip(_ label: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.caption.weight(.medium))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? theme.primary.opacity(0.15) : Color(.secondarySystemGroupedBackground))
                .foregroundStyle(isSelected ? theme.primary : .secondary)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private var catalogBrowseHint: some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: "magnifyingglass")
                .font(.system(size: 36))
                .foregroundStyle(.tertiary)
            Text("Search the needle catalog")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Text("Find needles by brand and add them to your collection and project.")
                .font(.caption)
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            Spacer()
        }
    }

    private var catalogResultsList: some View {
        List {
            ForEach(catalogVM.productLines) { line in
                Button {
                    selectedProductLine = line
                } label: {
                    productLineRow(line)
                }
                .buttonStyle(.plain)
            }
        }
        .listStyle(.plain)
    }

    private func productLineRow(_ line: ToolProductLine) -> some View {
        HStack(spacing: 12) {
            Circle()
                .fill(Color(hex: "#4ECDC4").opacity(0.2))
                .frame(width: 44, height: 44)
                .overlay {
                    Image(systemName: needleIcon(line.type))
                        .foregroundStyle(Color(hex: "#4ECDC4"))
                }

            VStack(alignment: .leading, spacing: 2) {
                Text(line.name)
                    .font(.subheadline.weight(.medium))
                if let brand = line.brand {
                    Text(brand.name)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                HStack(spacing: 8) {
                    Text(line.type.replacingOccurrences(of: "_", with: " ").capitalized)
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(.systemGray5), in: RoundedRectangle(cornerRadius: 4))
                    if let material = line.material {
                        Text(material.capitalized)
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                    if let sizes = line.sizes {
                        Text("\(sizes.count) sizes")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }
            }

            Spacer()

            Image(systemName: "plus.circle")
                .foregroundStyle(theme.primary)
        }
        .padding(.vertical, 4)
    }

    // MARK: - Shared Helpers

    private func needleRow(_ needle: Needle) -> some View {
        HStack(spacing: 12) {
            Circle()
                .fill(Color(hex: "#4ECDC4").opacity(0.2))
                .frame(width: 40, height: 40)
                .overlay {
                    Image(systemName: needleIcon(needle.type))
                        .foregroundStyle(Color(hex: "#4ECDC4"))
                }

            VStack(alignment: .leading, spacing: 2) {
                Text(needleDisplayLabel(needle))
                    .font(.subheadline.weight(.medium))
                HStack(spacing: 8) {
                    if let material = needle.material {
                        Text(material.capitalized)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    if let brand = needle.brand {
                        Text(brand)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer()
        }
    }

    private func needleDisplayLabel(_ needle: Needle) -> String {
        let typeLabel = needle.type.replacingOccurrences(of: "_", with: " ").capitalized
        let size = needle.sizeLabel ?? "\(String(format: needle.sizeMm.truncatingRemainder(dividingBy: 1) == 0 ? "%.0f" : "%.2g", needle.sizeMm))mm"
        var label = "\(size) \(typeLabel)"
        if let cm = needle.lengthCm { label += ", \(cm)cm" }
        return label
    }

    private func needleIcon(_ type: String) -> String {
        switch type {
        case "circular": return "arrow.triangle.2.circlepath"
        case "dpn": return "line.3.horizontal"
        case "crochet_hook": return "pencil"
        default: return "minus"
        }
    }

    // MARK: - Manual Entry

    private var manualEntrySection: some View {
        Section("Add needle") {
            Picker("Type", selection: $manualType) {
                ForEach(needleTypes, id: \.0) { value, label in
                    Text(label).tag(value)
                }
            }

            Picker("Size", selection: $manualSizeMm) {
                ForEach(commonSizes, id: \.self) { size in
                    let label = size.truncatingRemainder(dividingBy: 1) == 0
                        ? String(format: "%.0fmm", size) : String(format: "%.2gmm", size)
                    Text(label).tag(size)
                }
            }

            Picker("Material", selection: $manualMaterial) {
                ForEach(materials, id: \.0) { value, label in
                    Text(label).tag(value)
                }
            }

            Button {
                Task { await saveManualNeedle() }
            } label: {
                HStack {
                    if isSavingManual {
                        ProgressView().controlSize(.small)
                    }
                    Text("Add to collection")
                        .fontWeight(.medium)
                }
                .frame(maxWidth: .infinity)
                .foregroundStyle(theme.primary)
            }
            .disabled(isSavingManual)
        }
    }

    private func saveManualNeedle() async {
        isSavingManual = true
        defer { isSavingManual = false }
        do {
            struct NewNeedle: Decodable { let id: String }
            let body: [String: Any] = [
                "type": manualType,
                "size_mm": manualSizeMm,
                "material": manualMaterial,
            ]
            let data = try await APIClient.shared.post("/needles", body: body)
            let response = try JSONDecoder.iso8601.decode(APIResponse<NewNeedle>.self, from: data)
            onSelect(response.data.id)
            dismiss()
        } catch {
            // Fall back — still select even if save failed
        }
    }
}

// MARK: - Size Picker Sheet

/// Lets the user pick a specific size (and optionally length) from a product line.
private struct NeedleSizePickerSheet: View {
    let productLine: ToolProductLine
    let onSelect: (Double, String?, Int?) -> Void

    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss
    @State private var selectedSizeIndex: Int = 0
    @State private var selectedLength: Int?

    var body: some View {
        NavigationStack {
            List {
                // Product line info
                Section {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(productLine.name)
                            .font(.headline)
                        if let brand = productLine.brand {
                            Text(brand.name)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        HStack(spacing: 8) {
                            Text(productLine.type.replacingOccurrences(of: "_", with: " ").capitalized)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            if let material = productLine.material {
                                Text(material.capitalized)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }

                // Size picker
                if let sizes = productLine.sizes, !sizes.isEmpty {
                    Section("Size") {
                        ForEach(Array(sizes.enumerated()), id: \.offset) { index, size in
                            Button {
                                selectedSizeIndex = index
                            } label: {
                                HStack {
                                    Text(size.label)
                                        .font(.subheadline)
                                    Text("(\(String(format: "%.2g", size.mm))mm)")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                    Spacer()
                                    if selectedSizeIndex == index {
                                        Image(systemName: "checkmark")
                                            .foregroundStyle(theme.primary)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                // Length picker (for circulars)
                if let lengths = productLine.lengthsCm, !lengths.isEmpty {
                    Section("Cable length") {
                        ForEach(lengths, id: \.self) { length in
                            Button {
                                selectedLength = length
                            } label: {
                                HStack {
                                    Text("\(length)cm")
                                        .font(.subheadline)
                                    let inches = Double(length) / 2.54
                                    Text("(\(String(format: "%.0f", inches))\")")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                    Spacer()
                                    if selectedLength == length {
                                        Image(systemName: "checkmark")
                                            .foregroundStyle(theme.primary)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                // Info
                Section {
                    Label("This will add the needle to your collection and link it to the project.", systemImage: "info.circle")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Pick size")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let sizes = productLine.sizes ?? []
                        guard selectedSizeIndex < sizes.count else { return }
                        let size = sizes[selectedSizeIndex]
                        onSelect(size.mm, size.label, selectedLength)
                        dismiss()
                    }
                    .disabled(productLine.sizes?.isEmpty ?? true)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}
