import SwiftUI

@Observable
final class AIToolLookupViewModel {
    var brand = ""
    var setName = ""
    var result: ToolSet?
    var isSearching = false
    var isAdding = false
    var addResult: String?
    var error: String?

    func lookup() async {
        guard !brand.isEmpty, !setName.isEmpty else { return }
        isSearching = true
        defer { isSearching = false }

        struct Body: Encodable { let brand: String; let set_name: String }
        do {
            let response: APIResponse<ToolSet> = try await APIClient.shared.post(
                "/tool-catalog/lookup",
                body: Body(brand: brand, set_name: setName)
            )
            result = response.data
        } catch {
            self.error = error.localizedDescription
        }
    }

    func addToStash() async {
        guard let set = result else { return }
        isAdding = true
        defer { isAdding = false }

        struct Body: Encodable { let set_id: String }
        do {
            let response: APIResponse<AddSetResult> = try await APIClient.shared.post(
                "/tool-catalog/add-set",
                body: Body(set_id: set.id)
            )
            addResult = "Added \(response.data.added) items from \(response.data.setName)"
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct AIToolLookupSheet: View {
    @State private var viewModel = AIToolLookupViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Brand (e.g. ChiaoGoo)", text: $viewModel.brand)
                    TextField("Set name (e.g. TWIST Red Lace 5-inch)", text: $viewModel.setName)
                } header: {
                    Text("Search for a set")
                } footer: {
                    Text("We'll use AI to find the exact contents of this set and add it to the catalog.")
                }

                if viewModel.isSearching {
                    Section {
                        HStack {
                            Spacer()
                            ProgressView("Searching...")
                            Spacer()
                        }
                    }
                }

                if let result = viewModel.result, let items = result.items {
                    Section("Found: \(result.name)") {
                        ForEach(items) { item in
                            HStack {
                                Text(itemLabel(item))
                                    .font(.subheadline)
                                Spacer()
                                if item.quantity > 1 {
                                    Text("\u{00D7}\(item.quantity)")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }

                        Button {
                            Task { await viewModel.addToStash() }
                        } label: {
                            HStack {
                                Spacer()
                                if viewModel.isAdding {
                                    ProgressView().controlSize(.small)
                                } else {
                                    Label("Add all to my stash", systemImage: "plus.circle.fill")
                                }
                                Spacer()
                            }
                        }
                        .disabled(viewModel.isAdding)
                    }
                }
            }
            .navigationTitle("Find a set")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Search") {
                        Task { await viewModel.lookup() }
                    }
                    .disabled(viewModel.brand.isEmpty || viewModel.setName.isEmpty || viewModel.isSearching)
                }
            }
            .alert("Added", isPresented: .init(
                get: { viewModel.addResult != nil },
                set: { if !$0 { viewModel.addResult = nil } }
            )) {
                Button("OK") {
                    viewModel.addResult = nil
                    dismiss()
                }
            } message: {
                Text(viewModel.addResult ?? "")
            }
            .errorAlert(error: $viewModel.error)
        }
    }

    private func itemLabel(_ item: ToolSetItem) -> String {
        if item.type == "interchangeable_cable" {
            if let length = item.lengthCm {
                return "Cable \(length)cm"
            }
            return "Cable"
        }
        return item.sizeLabel ?? String(format: "%.1fmm", item.sizeMm)
    }
}
