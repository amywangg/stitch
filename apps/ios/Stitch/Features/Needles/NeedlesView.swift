import SwiftUI

struct NeedlesView: View {
    @Environment(ThemeManager.self) private var theme
    @Bindable var viewModel: NeedlesViewModel
    @Binding var ravelryConnected: Bool
    @Binding var showAddManual: Bool
    @Binding var navigateToCatalog: Bool
    var viewMode: StashViewMode
    @State private var expandedSets: Set<String> = []

    // Standalone init with internal state
    init() {
        let vm = NeedlesViewModel()
        self._viewModel = Bindable(vm)
        self._ravelryConnected = .constant(false)
        self._showAddManual = .constant(false)
        self._navigateToCatalog = .constant(false)
        self.viewMode = .list
    }

    // Parent-managed init
    init(viewModel: NeedlesViewModel, ravelryConnected: Binding<Bool>, showAddManual: Binding<Bool>, navigateToCatalog: Binding<Bool>, viewMode: StashViewMode) {
        self._viewModel = Bindable(viewModel)
        self._ravelryConnected = ravelryConnected
        self._showAddManual = showAddManual
        self._navigateToCatalog = navigateToCatalog
        self.viewMode = viewMode
    }

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.needles.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if viewModel.needles.isEmpty {
                ContentUnavailableView {
                    Label("No needles or hooks", systemImage: "pencil.and.outline")
                } description: {
                    Text("Add your needle and hook collection.")
                } actions: {
                    NavigationLink(value: Route.addFromCatalog) {
                        Label("Add a set", systemImage: "plus.circle")
                    }
                    .buttonStyle(.bordered)

                    Button {
                        showAddManual = true
                    } label: {
                        Label("Add individual", systemImage: "plus")
                    }
                    .buttonStyle(.bordered)

                    if ravelryConnected {
                        Button {
                            Task { await viewModel.syncRavelry() }
                        } label: {
                            Label("Sync from Ravelry", systemImage: "arrow.triangle.2.circlepath")
                        }
                        .buttonStyle(.bordered)
                    }
                }
            } else {
                switch viewMode {
                case .list:
                    needlesListLayout
                case .grid:
                    needlesGridLayout
                case .large:
                    needlesListLayout // Large uses same grouped list for needles
                }
            }
        }
        .navigationDestination(isPresented: $navigateToCatalog) {
            AddFromCatalogView()
        }
        .task {
            await viewModel.load()
        }
        .sheet(isPresented: $showAddManual) {
            AddManualNeedleSheet { needle in
                viewModel.needles.append(needle)
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
        .alert("Sync complete", isPresented: .init(
            get: { viewModel.syncMessage != nil },
            set: { if !$0 { viewModel.syncMessage = nil } }
        )) {
            Button("OK") { viewModel.syncMessage = nil }
        } message: {
            Text(viewModel.syncMessage ?? "")
        }
    }

}

// MARK: - Needle Layouts

extension NeedlesView {
    var needlesListLayout: some View {
        List {
            ForEach(viewModel.grouped) { group in
                if group.isSet {
                    setSection(group)
                } else {
                    Section(group.title) {
                        ForEach(group.items) { needle in
                            NeedleRowView(needle: needle)
                        }
                        .onDelete { indexSet in
                            for index in indexSet {
                                let needle = group.items[index]
                                Task { await viewModel.delete(needle) }
                            }
                        }
                    }
                }
            }

            Section {
                Menu {
                    Button {
                        navigateToCatalog = true
                    } label: {
                        Label("Add a set", systemImage: "rectangle.stack.badge.plus")
                    }
                    Button {
                        showAddManual = true
                    } label: {
                        Label("Add individual", systemImage: "plus")
                    }
                } label: {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                        Text("Add needles or hooks")
                            .font(.subheadline.weight(.medium))
                    }
                    .foregroundStyle(theme.primary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 4)
                }
                .listRowBackground(theme.primary.opacity(0.06))
            }
        }
        .listStyle(.insetGrouped)
        .refreshable { await viewModel.load() }
    }

    @ViewBuilder
    private func setSection(_ group: NeedlesViewModel.NeedleGroup) -> some View {
        let isExpanded = expandedSets.contains(group.id)

        Section {
            // Set header row
            Button {
                withAnimation(.snappy(duration: 0.3)) {
                    if isExpanded {
                        expandedSets.remove(group.id)
                    } else {
                        expandedSets.insert(group.id)
                    }
                }
            } label: {
                HStack(spacing: 10) {
                    // Small thumbnail when collapsed, or set icon
                    if let imageUrl = group.imageUrl, !imageUrl.isEmpty,
                       let url = URL(string: imageUrl) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable().aspectRatio(contentMode: .fill)
                            default:
                                RoundedRectangle(cornerRadius: 6)
                                    .fill(theme.primary.opacity(0.1))
                                    .overlay {
                                        Image(systemName: "rectangle.stack.fill")
                                            .font(.caption)
                                            .foregroundStyle(theme.primary.opacity(0.5))
                                    }
                            }
                        }
                        .frame(width: 36, height: 36)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                    } else {
                        Image(systemName: "rectangle.stack.fill")
                            .font(.title3)
                            .foregroundStyle(theme.primary)
                            .frame(width: 36)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text(group.title)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.primary)
                        if let subtitle = group.subtitle {
                            Text(subtitle)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }

                    Spacer()

                    Text("\(group.items.count) items")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .rotationEffect(.degrees(isExpanded ? 90 : 0))
                }
            }
            .buttonStyle(.plain)
            .listRowBackground(theme.primary.opacity(0.04))

            // Expanded: items only (thumbnail already in header)
            if isExpanded {
                ForEach(group.items) { needle in
                    NeedleRowView(needle: needle)
                }
                .onDelete { indexSet in
                    for index in indexSet {
                        let needle = group.items[index]
                        Task { await viewModel.delete(needle) }
                    }
                }
            }
        }
    }

    var needlesGridLayout: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                ForEach(viewModel.grouped) { group in
                    if group.isSet {
                        NeedleSetGridCell(group: group)
                    } else {
                        ForEach(group.items) { needle in
                            NeedleGridCell(needle: needle)
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
        }
        .refreshable { await viewModel.load() }
    }
}

// MARK: - Needle Grid Cells

struct NeedleSetGridCell: View {
    @Environment(ThemeManager.self) private var theme
    let group: NeedlesViewModel.NeedleGroup

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let imageUrl = group.imageUrl, !imageUrl.isEmpty,
               let url = URL(string: imageUrl) {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color(.systemGray5)
                }
                .frame(height: 100)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            } else {
                RoundedRectangle(cornerRadius: 8)
                    .fill(theme.primary.opacity(0.1))
                    .frame(height: 100)
                    .overlay {
                        Image(systemName: "rectangle.stack.fill")
                            .font(.title2)
                            .foregroundStyle(theme.primary.opacity(0.4))
                    }
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(group.title)
                    .font(.caption.weight(.semibold))
                    .lineLimit(2)
                if let subtitle = group.subtitle {
                    Text(subtitle)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Text("\(group.items.count) items")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(8)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct NeedleGridCell: View {
    @Environment(ThemeManager.self) private var theme
    let needle: Needle

    private func needleIcon(_ type: String) -> String {
        switch type {
        case "circular": return "arrow.triangle.capsulepath"
        case "dpn": return "line.3.horizontal"
        case "crochet_hook": return "pencil.and.outline"
        case "interchangeable_tip": return "arrow.left.arrow.right"
        case "interchangeable_cable": return "cable.connector"
        default: return "line.diagonal"
        }
    }

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: needleIcon(needle.type))
                .font(.title2)
                .foregroundStyle(theme.primary)
                .frame(height: 40)

            VStack(spacing: 2) {
                if needle.type == "interchangeable_cable" {
                    if let length = needle.lengthCm {
                        let inches = Double(length) / 2.54
                        Text("Cable \(length)cm / \(String(format: "%.0f", inches))″")
                            .font(.caption.weight(.medium))
                            .multilineTextAlignment(.center)
                    } else {
                        Text("Cable")
                            .font(.caption.weight(.medium))
                    }
                } else {
                    Text(needleSizeLabel)
                        .font(.caption.weight(.medium))
                        .multilineTextAlignment(.center)
                }
                if let material = needle.material {
                    Text(material.replacingOccurrences(of: "_", with: " ").capitalized)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(10)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var needleSizeLabel: String {
        var parts: [String] = []
        if let sizeLabel = needle.sizeLabel, !sizeLabel.isEmpty {
            parts.append(sizeLabel)
        }
        let mm = needle.sizeMm
        if mm > 0 {
            let mmStr = mm.truncatingRemainder(dividingBy: 1) == 0
                ? String(format: "%.0fmm", mm)
                : String(format: "%.1fmm", mm)
            if parts.isEmpty || !parts[0].contains("mm") {
                parts.append(mmStr)
            }
        }
        return parts.isEmpty ? "Unknown" : parts.joined(separator: " / ")
    }
}

// MARK: - Needle Row

struct NeedleRowView: View {
    @Environment(ThemeManager.self) private var theme
    let needle: Needle

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: needleIcon(needle.type))
                .font(.title3)
                .foregroundStyle(theme.primary)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: 3) {
                Text(primaryLabel)
                    .font(.subheadline.weight(.medium))

                HStack(spacing: 8) {
                    if let material = needle.material {
                        Text(material.replacingOccurrences(of: "_", with: " ").capitalized)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    if let brand = needle.brand {
                        Text(brand)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    if let lengthText = lengthLabel {
                        Text(lengthText)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer()

            if needle.ravelryId != nil {
                Text("R")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 5)
                    .padding(.vertical, 2)
                    .background(theme.primary, in: RoundedRectangle(cornerRadius: 4))
            }
        }
        .padding(.vertical, 2)
    }

    /// Primary label: cables show "Cable", needles show "US X / Ymm"
    private var primaryLabel: String {
        if needle.type == "interchangeable_cable" {
            if let length = needle.lengthCm {
                let inches = Double(length) / 2.54
                return "Cable \(length)cm / \(String(format: "%.0f", inches))″"
            }
            return "Cable"
        }

        // For needles/hooks: show US size + mm
        var parts: [String] = []
        if let sizeLabel = needle.sizeLabel, !sizeLabel.isEmpty {
            parts.append(sizeLabel)
        }
        let mm = needle.sizeMm
        if mm > 0 {
            let mmStr = mm.truncatingRemainder(dividingBy: 1) == 0
                ? String(format: "%.0fmm", mm)
                : String(format: "%.1fmm", mm)
            // Avoid duplicating if sizeLabel already contains the mm value
            if parts.isEmpty || !parts[0].contains("mm") {
                parts.append(mmStr)
            }
        }
        return parts.isEmpty ? "Unknown" : parts.joined(separator: " / ")
    }

    /// Length label in both cm and inches (for non-cable items)
    private var lengthLabel: String? {
        // Cables show length in primaryLabel
        if needle.type == "interchangeable_cable" { return nil }
        guard let length = needle.lengthCm else { return nil }
        let inches = Double(length) / 2.54
        return "\(length)cm / \(String(format: "%.0f", inches))″"
    }

    private func needleIcon(_ type: String) -> String {
        switch type {
        case "circular": return "arrow.triangle.capsulepath"
        case "dpn": return "line.3.horizontal"
        case "crochet_hook": return "pencil.and.outline"
        case "interchangeable_tip": return "arrow.left.arrow.right"
        case "interchangeable_cable": return "cable.connector"
        default: return "line.diagonal"
        }
    }
}

// MARK: - Add Needle Sheet (catalog browse + custom)

@Observable
final class AddNeedleViewModel {
    var productLines: [ToolProductLine] = []
    var isLoading = false
    var error: String?

    func load(type: String? = nil) async {
        isLoading = true
        defer { isLoading = false }
        do {
            struct Response: Decodable { let items: [ToolProductLine] }
            var path = "/tool-catalog/product-lines"
            if let type { path += "?type=\(type)" }
            let response: APIResponse<Response> = try await APIClient.shared.get(path)
            productLines = response.data.items
        } catch {
            self.error = error.localizedDescription
        }
    }

    /// Group product lines by brand name
    var groupedByBrand: [(brand: String, lines: [ToolProductLine])] {
        let dict = Dictionary(grouping: productLines, by: { $0.brand?.name ?? "Other" })
        return dict.sorted { $0.key < $1.key }.map { (brand: $0.key, lines: $0.value) }
    }
}

struct AddManualNeedleSheet: View {
    let onAdded: (Needle) -> Void
    @Environment(\.dismiss) private var dismiss
    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = AddNeedleViewModel()
    @State private var selectedLine: ToolProductLine?
    @State private var showCustomForm = false
    @State private var filterType: String?

    private let typeFilters: [(value: String?, label: String)] = [
        (nil, "All"),
        ("circular", "Circulars"),
        ("straight", "Straights"),
        ("dpn", "DPNs"),
        ("crochet_hook", "Crochet hooks"),
    ]

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.productLines.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        // Type filter chips
                        Section {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(typeFilters, id: \.label) { filter in
                                        Button {
                                            filterType = filter.value
                                            Task { await viewModel.load(type: filterType) }
                                        } label: {
                                            Text(filter.label)
                                                .font(.caption.weight(.medium))
                                                .padding(.horizontal, 12)
                                                .padding(.vertical, 6)
                                                .background(
                                                    filterType == filter.value
                                                        ? theme.primary
                                                        : theme.primary.opacity(0.1),
                                                    in: Capsule()
                                                )
                                                .foregroundStyle(
                                                    filterType == filter.value ? .white : theme.primary
                                                )
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                            .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                        }

                        // Product lines grouped by brand
                        ForEach(viewModel.groupedByBrand, id: \.brand) { group in
                            Section(group.brand) {
                                ForEach(group.lines) { line in
                                    Button {
                                        selectedLine = line
                                    } label: {
                                        HStack(spacing: 12) {
                                            Image(systemName: typeIcon(line.type))
                                                .font(.title3)
                                                .foregroundStyle(theme.primary)
                                                .frame(width: 28)

                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(line.name)
                                                    .font(.subheadline.weight(.medium))
                                                    .foregroundStyle(.primary)
                                                HStack(spacing: 8) {
                                                    if let material = line.material {
                                                        Text(material.replacingOccurrences(of: "_", with: " ").capitalized)
                                                            .font(.caption)
                                                            .foregroundStyle(.secondary)
                                                    }
                                                    if let sizes = line.sizes {
                                                        Text("\(sizes.count) sizes")
                                                            .font(.caption)
                                                            .foregroundStyle(.secondary)
                                                    }
                                                }
                                            }

                                            Spacer()
                                            Image(systemName: "chevron.right")
                                                .font(.caption)
                                                .foregroundStyle(.tertiary)
                                        }
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }

                        // Custom option
                        Section {
                            Button {
                                showCustomForm = true
                            } label: {
                                Label("Add custom needle or hook", systemImage: "plus.circle")
                                    .foregroundStyle(theme.primary)
                            }
                        }
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("Add needle")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .task { await viewModel.load(type: filterType) }
            .sheet(item: $selectedLine) { line in
                CatalogNeedlePickerSheet(productLine: line, onAdded: onAdded)
            }
            .sheet(isPresented: $showCustomForm) {
                CustomNeedleSheet(onAdded: onAdded)
            }
        }
    }

    private func typeIcon(_ type: String) -> String {
        switch type {
        case "circular": return "arrow.triangle.capsulepath"
        case "straight": return "line.diagonal"
        case "dpn": return "line.3.horizontal"
        case "crochet_hook": return "pencil.and.outline"
        default: return "line.diagonal"
        }
    }
}

// MARK: - Catalog Needle Picker (size + length selection)

struct CatalogNeedlePickerSheet: View {
    let productLine: ToolProductLine
    let onAdded: (Needle) -> Void
    @Environment(\.dismiss) private var dismiss
    @Environment(ThemeManager.self) private var theme

    @State private var selectedSize: ProductLineSize?
    @State private var selectedLengthCm: Int?
    @State private var isSubmitting = false

    private var hasLengths: Bool {
        guard let lengths = productLine.lengthsCm else { return false }
        return !lengths.isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        Image(systemName: typeIcon(productLine.type))
                            .font(.title2)
                            .foregroundStyle(theme.primary)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(productLine.name)
                                .font(.subheadline.weight(.semibold))
                            Text(productLine.brand?.name ?? "")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                // Size picker
                if let sizes = productLine.sizes, !sizes.isEmpty {
                    Section("Size") {
                        ForEach(sizes, id: \.mm) { size in
                            Button {
                                selectedSize = size
                            } label: {
                                HStack {
                                    Text(size.label)
                                        .font(.subheadline)
                                        .foregroundStyle(.primary)

                                    let mmStr = size.mm.truncatingRemainder(dividingBy: 1) == 0
                                        ? String(format: "%.0fmm", size.mm)
                                        : String(format: "%.1fmm", size.mm)
                                    Text(mmStr)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)

                                    Spacer()

                                    if selectedSize == size {
                                        Image(systemName: "checkmark")
                                            .font(.subheadline.weight(.semibold))
                                            .foregroundStyle(theme.primary)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                // Length picker
                if hasLengths, let lengths = productLine.lengthsCm {
                    Section("Length") {
                        ForEach(lengths, id: \.self) { cm in
                            Button {
                                selectedLengthCm = cm
                            } label: {
                                HStack {
                                    let inches = Double(cm) / 2.54
                                    Text("\(cm)cm / \(String(format: "%.0f", inches))″")
                                        .font(.subheadline)
                                        .foregroundStyle(.primary)

                                    Spacer()

                                    if selectedLengthCm == cm {
                                        Image(systemName: "checkmark")
                                            .font(.subheadline.weight(.semibold))
                                            .foregroundStyle(theme.primary)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .navigationTitle("Select size")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        Task { await addFromCatalog() }
                    }
                    .disabled(selectedSize == nil || isSubmitting)
                }
            }
        }
        .presentationDetents([.large])
    }

    private func addFromCatalog() async {
        guard let size = selectedSize else { return }
        isSubmitting = true
        defer { isSubmitting = false }

        struct Body: Encodable {
            let type: String
            let size_mm: Double
            let size_label: String?
            let length_cm: Int?
            let material: String?
            let brand: String?
        }

        do {
            let response: APIResponse<Needle> = try await APIClient.shared.post(
                "/needles",
                body: Body(
                    type: productLine.type,
                    size_mm: size.mm,
                    size_label: size.label,
                    length_cm: selectedLengthCm,
                    material: productLine.material,
                    brand: productLine.brand?.name
                )
            )
            onAdded(response.data)
            dismiss()
        } catch {}
    }

    private func typeIcon(_ type: String) -> String {
        switch type {
        case "circular": return "arrow.triangle.capsulepath"
        case "straight": return "line.diagonal"
        case "dpn": return "line.3.horizontal"
        case "crochet_hook": return "pencil.and.outline"
        default: return "line.diagonal"
        }
    }
}

// MARK: - Custom Needle Sheet (fully manual entry)

struct CustomNeedleSheet: View {
    let onAdded: (Needle) -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var type = "straight"
    @State private var sizeMm = ""
    @State private var sizeLabel = ""
    @State private var lengthCm = ""
    @State private var material = ""
    @State private var brand = ""
    @State private var isSubmitting = false

    var body: some View {
        NavigationStack {
            Form {
                Picker("Type", selection: $type) {
                    Text("Straight").tag("straight")
                    Text("Circular").tag("circular")
                    Text("DPN").tag("dpn")
                    Text("Crochet hook").tag("crochet_hook")
                    Text("Interchangeable tip").tag("interchangeable_tip")
                    Text("Interchangeable cable").tag("interchangeable_cable")
                }

                TextField("Size (mm)", text: $sizeMm)
                    .keyboardType(.decimalPad)

                TextField("Size label (e.g. US 7)", text: $sizeLabel)

                TextField("Length (cm)", text: $lengthCm)
                    .keyboardType(.numberPad)

                Picker("Material", selection: $material) {
                    Text("Not specified").tag("")
                    Text("Stainless steel").tag("stainless_steel")
                    Text("Bamboo").tag("bamboo")
                    Text("Wood").tag("wood")
                    Text("Aluminum").tag("aluminum")
                    Text("Plastic").tag("plastic")
                    Text("Carbon fiber").tag("carbon_fiber")
                }

                TextField("Brand", text: $brand)
            }
            .navigationTitle("Custom needle")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        Task { await addNeedle() }
                    }
                    .disabled(sizeMm.isEmpty || isSubmitting)
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func addNeedle() async {
        isSubmitting = true
        defer { isSubmitting = false }

        struct Body: Encodable {
            let type: String
            let size_mm: Double
            let size_label: String?
            let length_cm: Int?
            let material: String?
            let brand: String?
        }

        do {
            let response: APIResponse<Needle> = try await APIClient.shared.post(
                "/needles",
                body: Body(
                    type: type,
                    size_mm: Double(sizeMm) ?? 0,
                    size_label: sizeLabel.isEmpty ? nil : sizeLabel,
                    length_cm: lengthCm.isEmpty ? nil : Int(lengthCm),
                    material: material.isEmpty ? nil : material,
                    brand: brand.isEmpty ? nil : brand
                )
            )
            onAdded(response.data)
            dismiss()
        } catch {}
    }
}
