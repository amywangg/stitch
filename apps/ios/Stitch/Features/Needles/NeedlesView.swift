import SwiftUI

struct NeedlesView: View {
    @State private var viewModel = NeedlesViewModel()
    @State private var ravelryConnected = false
    @State private var showAddManual = false
    @State private var navigateToCatalog = false

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
                List {
                    ForEach(viewModel.grouped, id: \.type) { group in
                        Section(formatNeedleType(group.type)) {
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
                            .foregroundStyle(Color(hex: "#FF6B6B"))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 4)
                        }
                        .listRowBackground(Color(hex: "#FF6B6B").opacity(0.06))
                    }
                }
                .listStyle(.insetGrouped)
                .refreshable { await viewModel.load() }
            }
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: 12) {
                    if ravelryConnected {
                        Button {
                            Task { await viewModel.syncRavelry() }
                        } label: {
                            if viewModel.isSyncing {
                                ProgressView().controlSize(.small)
                            } else {
                                Image(systemName: "arrow.triangle.2.circlepath")
                            }
                        }
                        .disabled(viewModel.isSyncing)
                    }

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
                        Image(systemName: "plus")
                    }
                }
            }
        }
        .navigationDestination(isPresented: $navigateToCatalog) {
            AddFromCatalogView()
        }
        .task {
            await viewModel.load()
            await loadRavelryStatus()
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

    private func loadRavelryStatus() async {
        do {
            struct StatusResponse: Decodable { let connected: Bool }
            let res: APIResponse<StatusResponse> = try await APIClient.shared.get(
                "/integrations/ravelry/status"
            )
            ravelryConnected = res.data.connected
        } catch {}
    }

    private func formatNeedleType(_ type: String) -> String {
        switch type {
        case "straight": return "Straight needles"
        case "circular": return "Circular needles"
        case "dpn": return "Double-pointed needles"
        case "crochet_hook": return "Crochet hooks"
        case "interchangeable_tip": return "Interchangeable tips"
        case "interchangeable_cable": return "Interchangeable cables"
        default: return type.capitalized
        }
    }
}

// MARK: - Needle Row

struct NeedleRowView: View {
    let needle: Needle

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: needleIcon(needle.type))
                .font(.title3)
                .foregroundStyle(Color(hex: "#FF6B6B"))
                .frame(width: 32)

            VStack(alignment: .leading, spacing: 3) {
                Text(needle.sizeLabel ?? String(format: "%.1fmm", needle.sizeMm))
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
                    if (needle.type == "circular" || needle.type == "interchangeable_cable"),
                       let length = needle.lengthCm {
                        Text("\(length)cm")
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
                    .background(Color(hex: "#FF6B6B"), in: RoundedRectangle(cornerRadius: 4))
            }
        }
        .padding(.vertical, 2)
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

// MARK: - Add Manual Needle Sheet

struct AddManualNeedleSheet: View {
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

                if type == "circular" || type == "interchangeable_cable" {
                    TextField("Length (cm)", text: $lengthCm)
                        .keyboardType(.numberPad)
                }

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
            .navigationTitle("Add needle")
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
