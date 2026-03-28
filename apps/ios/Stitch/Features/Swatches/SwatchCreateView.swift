import SwiftUI
import PhotosUI

@Observable
final class SwatchCreateViewModel {
    var title = ""
    var stitchPattern = ""
    var craftType = "knitting"
    var stitchesPer10cm = ""
    var rowsPer10cm = ""
    var needleSizeMm = ""
    var needleSizeLabel = ""
    var needleType = "circular"
    var notes = ""
    var isPublic = false
    var washed = false
    var blocked = false

    var photoUrl: String?
    var photoPath: String?
    var isUploadingPhoto = false
    var photoWarning: String?

    var selectedYarns: [SelectedStashYarn] = []
    var isSaving = false
    var error: String?

    struct SelectedStashYarn: Identifiable {
        let id: String // stash item id
        let yarnId: String?
        let displayName: String
        let colorway: String?
        var strands: Int = 1
    }

    struct PhotoUploadResponse: Decodable {
        let url: String
        let path: String
        let containsYarnOrFabric: Bool?
        let warning: String?
    }

    func uploadPhoto(data: Data) async {
        isUploadingPhoto = true
        defer { isUploadingPhoto = false }
        do {
            let response: APIResponse<PhotoUploadResponse> = try await APIClient.shared.upload(
                "/swatches/photo",
                imageData: data,
                mimeType: "image/jpeg",
                fileName: "swatch.jpg"
            )
            photoUrl = response.data.url
            photoPath = response.data.path
            photoWarning = response.data.warning
        } catch {
            self.error = error.localizedDescription
        }
    }

    func save() async -> Bool {
        guard !title.trimmingCharacters(in: .whitespaces).isEmpty else {
            error = "Title is required"
            return false
        }
        isSaving = true
        defer { isSaving = false }

        var body: [String: Any] = [
            "title": title.trimmingCharacters(in: .whitespaces),
            "craft_type": craftType,
            "is_public": isPublic,
            "washed": washed,
            "blocked": blocked,
        ]

        if !stitchPattern.isEmpty { body["stitch_pattern"] = stitchPattern }
        if !notes.isEmpty { body["notes"] = notes }
        if let sts = Double(stitchesPer10cm) { body["stitches_per_10cm"] = sts }
        if let rows = Double(rowsPer10cm) { body["rows_per_10cm"] = rows }
        if let mm = Double(needleSizeMm) { body["needle_size_mm"] = mm }
        if !needleSizeLabel.isEmpty { body["needle_size_label"] = needleSizeLabel }
        body["needle_type"] = needleType
        if let url = photoUrl { body["photo_url"] = url }
        if let path = photoPath { body["photo_path"] = path }

        if !selectedYarns.isEmpty {
            body["yarns"] = selectedYarns.map { yarn in
                var y: [String: Any] = ["stash_item_id": yarn.id, "strands": yarn.strands]
                if let yarnId = yarn.yarnId { y["yarn_id"] = yarnId }
                if let cw = yarn.colorway { y["colorway"] = cw }
                return y
            }
        }

        do {
            let _ = try await APIClient.shared.post("/swatches", body: body)
            return true
        } catch {
            self.error = error.localizedDescription
            return false
        }
    }
}

struct SwatchCreateView: View {
    let onCreated: () -> Void
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = SwatchCreateViewModel()
    @State private var showStashPicker = false
    @State private var selectedPhotoItem: PhotosPickerItem?

    var body: some View {
        NavigationStack {
            Form {
                Section("Photo") {
                    if let url = viewModel.photoUrl, let imageUrl = URL(string: url) {
                        AsyncImage(url: imageUrl) { image in
                            image.resizable().aspectRatio(contentMode: .fill)
                        } placeholder: {
                            ProgressView()
                        }
                        .frame(height: 200)
                        .clipShape(RoundedRectangle(cornerRadius: 10))

                        if let warning = viewModel.photoWarning {
                            Label(warning, systemImage: "exclamationmark.triangle")
                                .font(.caption)
                                .foregroundStyle(.orange)
                        }
                    }

                    PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                        Label(
                            viewModel.photoUrl != nil ? "Change photo" : "Add photo",
                            systemImage: "camera"
                        )
                    }
                    .onChange(of: selectedPhotoItem) { _, item in
                        guard let item else { return }
                        Task {
                            if let data = try? await item.loadTransferable(type: Data.self) {
                                await viewModel.uploadPhoto(data: data)
                            }
                        }
                    }

                    if viewModel.isUploadingPhoto {
                        HStack {
                            ProgressView().controlSize(.small)
                            Text("Uploading...").font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }

                Section("Details") {
                    TextField("Title", text: $viewModel.title)
                    TextField("Stitch pattern", text: $viewModel.stitchPattern, prompt: Text("e.g. Stockinette, 2x2 rib"))

                    Picker("Craft", selection: $viewModel.craftType) {
                        Text("Knitting").tag("knitting")
                        Text("Crochet").tag("crochet")
                    }
                }

                Section("Gauge") {
                    HStack {
                        TextField("Stitches/10cm", text: $viewModel.stitchesPer10cm)
                            .keyboardType(.decimalPad)
                        TextField("Rows/10cm", text: $viewModel.rowsPer10cm)
                            .keyboardType(.decimalPad)
                    }
                    HStack {
                        TextField("Needle size (mm)", text: $viewModel.needleSizeMm)
                            .keyboardType(.decimalPad)
                        Picker("Type", selection: $viewModel.needleType) {
                            Text("Circular").tag("circular")
                            Text("Straight").tag("straight")
                            Text("DPN").tag("dpn")
                            Text("Hook").tag("crochet_hook")
                        }
                        .pickerStyle(.menu)
                    }
                    Toggle("Washed", isOn: $viewModel.washed)
                    Toggle("Blocked", isOn: $viewModel.blocked)
                }

                Section("Yarns") {
                    ForEach(viewModel.selectedYarns) { yarn in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(yarn.displayName)
                                    .font(.subheadline)
                                if let cw = yarn.colorway {
                                    Text(cw).font(.caption).foregroundStyle(.secondary)
                                }
                            }
                            Spacer()
                            if yarn.strands > 1 {
                                Text("×\(yarn.strands)")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(theme.primary, in: Capsule())
                            }
                            Button {
                                viewModel.selectedYarns.removeAll { $0.id == yarn.id }
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundStyle(.tertiary)
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    Button {
                        showStashPicker = true
                    } label: {
                        Label("Add from stash", systemImage: "plus.circle")
                            .foregroundStyle(theme.primary)
                    }
                }

                Section {
                    Toggle("Share with community", isOn: $viewModel.isPublic)
                } footer: {
                    Text("Public swatches can be browsed by other users for inspiration")
                }

                Section("Notes") {
                    TextEditor(text: $viewModel.notes)
                        .frame(minHeight: 60)
                }
            }
            .navigationTitle("New swatch")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task {
                            if await viewModel.save() {
                                onCreated()
                                dismiss()
                            }
                        }
                    } label: {
                        if viewModel.isSaving {
                            ProgressView().controlSize(.small)
                        } else {
                            Text("Save")
                        }
                    }
                    .disabled(viewModel.isSaving || viewModel.title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .sheet(isPresented: $showStashPicker) {
                StashPickerSheet { stashItemId in
                    // Look up the stash item to populate display info
                    Task {
                        do {
                            let response: APIResponse<StashItem> = try await APIClient.shared.get("/stash/\(stashItemId)")
                            let item = response.data
                            let displayName: String
                            if let company = item.yarn?.company?.name, let name = item.yarn?.name {
                                displayName = "\(company) \(name)"
                            } else {
                                displayName = item.yarn?.name ?? "Unknown yarn"
                            }
                            viewModel.selectedYarns.append(
                                SwatchCreateViewModel.SelectedStashYarn(
                                    id: item.id,
                                    yarnId: item.yarnId,
                                    displayName: displayName,
                                    colorway: item.colorway
                                )
                            )
                        } catch {}
                    }
                }
            }
            .errorAlert(error: $viewModel.error)
        }
    }
}
