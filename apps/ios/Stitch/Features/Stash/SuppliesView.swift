import SwiftUI

// MARK: - ViewModel

@Observable
final class SuppliesViewModel {
    var items: [Supply] = []
    var isLoading = false
    var error: String?

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            struct SuppliesResponse: Decodable { let items: [Supply] }
            let response: APIResponse<SuppliesResponse> = try await APIClient.shared.get("/supplies")
            items = response.data.items
        } catch {
            self.error = error.localizedDescription
        }
    }

    func delete(_ item: Supply) async {
        struct Empty: Decodable {}
        do {
            let _: Empty = try await APIClient.shared.delete("/supplies/\(item.id)")
            items.removeAll { $0.id == item.id }
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - View

struct SuppliesView: View {
    @State private var viewModel = SuppliesViewModel()
    @State private var showAddSheet = false

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.items.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if viewModel.items.isEmpty {
                ContentUnavailableView(
                    "No supplies yet",
                    systemImage: "archivebox",
                    description: Text("Track your stitch markers, blocking mats, and other notions.")
                )
            } else {
                List {
                    ForEach(grouped, id: \.category) { group in
                        Section(formatCategory(group.category)) {
                            ForEach(group.items) { item in
                                SupplyRowView(item: item)
                            }
                            .onDelete { indexSet in
                                for index in indexSet {
                                    let item = group.items[index]
                                    Task { await viewModel.delete(item) }
                                }
                            }
                        }
                    }

                    Section {
                        Button {
                            showAddSheet = true
                        } label: {
                            HStack {
                                Image(systemName: "plus.circle.fill")
                                    .font(.title3)
                                Text("Add supply")
                                    .font(.subheadline.weight(.medium))
                            }
                            .foregroundStyle(Color(hex: "#4ECDC4"))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 4)
                        }
                        .listRowBackground(Color(hex: "#4ECDC4").opacity(0.06))
                    }
                }
                .listStyle(.insetGrouped)
                .refreshable { await viewModel.load() }
            }
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showAddSheet = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .task { await viewModel.load() }
        .sheet(isPresented: $showAddSheet) {
            AddSupplySheet { item in
                viewModel.items.append(item)
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

    private var grouped: [(category: String, items: [Supply])] {
        let dict = Dictionary(grouping: viewModel.items, by: { $0.category })
        return dict.sorted { $0.key < $1.key }.map { (category: $0.key, items: $0.value) }
    }

    private func formatCategory(_ category: String) -> String {
        category.replacingOccurrences(of: "_", with: " ").capitalized
    }
}

// MARK: - Supply Row

struct SupplyRowView: View {
    let item: Supply

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: categoryIcon(item.category))
                .font(.title3)
                .foregroundStyle(Color(hex: "#4ECDC4"))
                .frame(width: 32)

            VStack(alignment: .leading, spacing: 3) {
                Text(item.name)
                    .font(.subheadline.weight(.medium))
                HStack(spacing: 8) {
                    if let brand = item.brand, !brand.isEmpty {
                        Text(brand)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    if item.quantity > 1 {
                        Text("Qty: \(item.quantity)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .padding(.vertical, 2)
    }

    private func categoryIcon(_ category: String) -> String {
        switch category {
        case "stitch_markers": return "smallcircle.filled.circle"
        case "tape_measure": return "ruler"
        case "scissors": return "scissors"
        case "row_counter": return "number"
        case "cable_needles": return "arrow.left.arrow.right"
        case "stitch_holders": return "pin"
        case "blocking_mats": return "square.grid.3x3"
        case "blocking_pins": return "mappin"
        case "yarn_bowl": return "cup.and.saucer"
        case "swift": return "arrow.trianglehead.counterclockwise.rotate.90"
        case "ball_winder": return "gear"
        case "darning_needles": return "line.diagonal"
        default: return "archivebox"
        }
    }
}

// MARK: - Add Supply Sheet

struct AddSupplySheet: View {
    let onAdded: (Supply) -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var category = "other"
    @State private var brand = ""
    @State private var quantity = 1
    @State private var notes = ""
    @State private var isSubmitting = false

    private let categories = [
        ("stitch_markers", "Stitch markers"),
        ("tape_measure", "Tape measure"),
        ("scissors", "Scissors"),
        ("row_counter", "Row counter"),
        ("cable_needles", "Cable needles"),
        ("stitch_holders", "Stitch holders"),
        ("blocking_mats", "Blocking mats"),
        ("blocking_pins", "Blocking pins"),
        ("yarn_bowl", "Yarn bowl"),
        ("swift", "Swift"),
        ("ball_winder", "Ball winder"),
        ("darning_needles", "Darning needles"),
        ("pom_pom_maker", "Pom pom maker"),
        ("other", "Other"),
    ]

    var body: some View {
        NavigationStack {
            Form {
                TextField("Name", text: $name)

                Picker("Category", selection: $category) {
                    ForEach(categories, id: \.0) { value, label in
                        Text(label).tag(value)
                    }
                }

                TextField("Brand", text: $brand)

                Stepper("Quantity: \(quantity)", value: $quantity, in: 1...999)

                TextField("Notes", text: $notes, axis: .vertical)
                    .lineLimit(3)
            }
            .navigationTitle("Add supply")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        Task { await addSupply() }
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || isSubmitting)
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func addSupply() async {
        isSubmitting = true
        defer { isSubmitting = false }

        struct Body: Encodable {
            let name: String
            let category: String
            let brand: String?
            let quantity: Int
            let notes: String?
        }

        do {
            let response: APIResponse<Supply> = try await APIClient.shared.post(
                "/supplies",
                body: Body(
                    name: name.trimmingCharacters(in: .whitespaces),
                    category: category,
                    brand: brand.isEmpty ? nil : brand,
                    quantity: quantity,
                    notes: notes.isEmpty ? nil : notes
                )
            )
            onAdded(response.data)
            dismiss()
        } catch {}
    }
}
