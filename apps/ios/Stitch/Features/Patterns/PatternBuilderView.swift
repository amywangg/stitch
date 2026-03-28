import PhotosUI
import SwiftUI

// MARK: - Pattern Needle Entry

struct PatternNeedleEntry: Identifiable {
    let id = UUID().uuidString
    var type: String = "straight"
    var sizeMm: Double = 4.0
    var lengthCm: Int?
    var material: String?
    var brand: String?
    var notes: String?
    var fromCollection: Bool = false
    var needleId: String?
}

// MARK: - ViewModel

@Observable
final class PatternBuilderViewModel {
    var pattern: Pattern?
    var isLoading = false
    var isSaving = false
    var error: String?
    var successMessage: String?

    // Edited metadata (local state before save)
    var title = ""
    var designerName = ""
    var craftType = "knitting"
    var difficulty = ""
    var garmentType = ""
    var yarnWeight = ""
    var needleSizeMm = ""
    var gaugeStitches = ""
    var gaugeRows = ""
    var gaugePattern = ""
    var description = ""

    var isExportingPdf = false
    var isUploadingPhoto = false
    var coverImageUrl: String?

    // Needles
    var patternNeedles: [PatternNeedleEntry] = []

    var patternId: String?
    var isDraft: Bool { patternId == nil }

    // MARK: - Load

    func load(patternId: String) async {
        self.patternId = patternId
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<Pattern> = try await APIClient.shared.get("/patterns/\(patternId)")
            pattern = response.data
            populateFromPattern(response.data)
            await estimateGauge()
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func populateFromPattern(_ p: Pattern) {
        title = p.title
        designerName = p.designerName ?? ""
        craftType = p.craftType ?? "knitting"
        difficulty = p.difficulty ?? ""
        garmentType = p.garmentType ?? ""
        yarnWeight = p.yarnWeight ?? ""
        needleSizeMm = p.needleSizeMm.map { String($0) } ?? ""
        gaugeStitches = p.gaugeStitchesPer10cm.map { String($0) } ?? ""
        gaugeRows = p.gaugeRowsPer10cm.map { String($0) } ?? ""
        gaugePattern = p.gaugeStitchPattern ?? ""
        description = p.description ?? ""
        coverImageUrl = p.coverImageUrl
    }

    // MARK: - Auto-fill Designer

    func autoFillDesigner() async {
        guard isDraft, designerName.isEmpty else { return }
        do {
            let response: APIResponse<User> = try await APIClient.shared.get("/users/me")
            let user = response.data
            designerName = user.displayName ?? user.username
        } catch is CancellationError {
            // View dismissed — ignore
        } catch {
            // Non-critical — don't show error
        }
    }

    // MARK: - Save Metadata

    func saveMetadata() async {
        let trimmedTitle = title.trimmingCharacters(in: .whitespaces)
        guard !trimmedTitle.isEmpty else { return }
        isSaving = true
        defer { isSaving = false }

        // Draft mode: create the pattern first
        if isDraft {
            do {
                struct CreateBody: Encodable {
                    let title: String
                    let craft_type: String
                }
                struct CreateResult: Decodable { let id: String }
                let response: APIResponse<CreateResult> = try await APIClient.shared.post(
                    "/patterns",
                    body: CreateBody(title: trimmedTitle, craft_type: craftType)
                )
                patternId = response.data.id

                // Now patch the remaining fields onto the new pattern
                await patchMetadata(patternId: response.data.id)
            } catch {
                self.error = error.localizedDescription
            }
            return
        }

        guard let patternId else { return }
        await patchMetadata(patternId: patternId)
    }

    private func patchMetadata(patternId: String) async {
        var body: [String: Any] = [
            "title": title.trimmingCharacters(in: .whitespaces),
            "craft_type": craftType,
        ]
        body["designer_name"] = designerName.isEmpty ? nil : designerName
        body["difficulty"] = difficulty.isEmpty ? nil : difficulty
        body["garment_type"] = garmentType.isEmpty ? nil : garmentType
        body["yarn_weight"] = yarnWeight.isEmpty ? nil : yarnWeight
        body["description"] = description.isEmpty ? nil : description

        if let mm = Double(needleSizeMm) { body["needle_size_mm"] = mm }
        else { body["needle_size_mm"] = nil }
        if let sts = Double(gaugeStitches) { body["gauge_stitches_per_10cm"] = sts }
        else { body["gauge_stitches_per_10cm"] = nil }
        if let rows = Double(gaugeRows) { body["gauge_rows_per_10cm"] = rows }
        else { body["gauge_rows_per_10cm"] = nil }
        body["gauge_stitch_pattern"] = gaugePattern.isEmpty ? nil : gaugePattern

        do {
            let _ = try await APIClient.shared.patch(
                "/patterns/\(patternId)",
                body: body
            )
            await load(patternId: patternId)
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Section CRUD

    func addSection(name: String) async {
        guard let patternId else { return }
        do {
            struct Body: Encodable { let name: String }
            struct Section: Decodable { let id: String }
            let _: APIResponse<Section> = try await APIClient.shared.post(
                "/patterns/\(patternId)/sections",
                body: Body(name: name)
            )
            await load(patternId: patternId)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func renameSection(_ sectionId: String, to name: String) async {
        guard let patternId else { return }
        do {
            struct Body: Encodable { let name: String }
            struct Section: Decodable { let id: String }
            let _: APIResponse<Section> = try await APIClient.shared.patch(
                "/patterns/\(patternId)/sections/\(sectionId)",
                body: Body(name: name)
            )
            await load(patternId: patternId)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deleteSection(_ sectionId: String) async {
        guard let patternId else { return }
        do {
            struct Empty: Decodable {}
            let _: APIResponse<Empty> = try await APIClient.shared.delete(
                "/patterns/\(patternId)/sections/\(sectionId)"
            )
            await load(patternId: patternId)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func reorderSections(_ sectionIds: [String]) async {
        guard let patternId else { return }
        do {
            struct Body: Encodable { let section_ids: [String] }
            struct Empty: Decodable {}
            let _: APIResponse<Empty> = try await APIClient.shared.put(
                "/patterns/\(patternId)/sections",
                body: Body(section_ids: sectionIds)
            )
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Yarn CRUD

    var gaugeEstimate: GaugeEstimate?

    func addYarn(name: String, weight: String?, colorway: String?, fiberContent: String?, strands: Int) async {
        guard let patternId else { return }
        do {
            var body: [String: Any] = ["name": name, "strands": strands]
            if let w = weight, !w.isEmpty { body["weight"] = w }
            if let c = colorway, !c.isEmpty { body["colorway"] = c }
            if let f = fiberContent, !f.isEmpty { body["fiber_content"] = f }

            let _ = try await APIClient.shared.post(
                "/patterns/\(patternId)/yarns",
                body: body
            )
            await load(patternId: patternId)
            await estimateGauge()
        } catch {
            self.error = error.localizedDescription
        }
    }

    func updateYarn(yarnId: String, name: String, weight: String?, colorway: String?, fiberContent: String?, strands: Int) async {
        guard let patternId else { return }
        do {
            var body: [String: Any] = ["name": name, "strands": strands]
            body["weight"] = weight?.isEmpty == false ? weight : NSNull()
            body["colorway"] = colorway?.isEmpty == false ? colorway : NSNull()
            body["fiber_content"] = fiberContent?.isEmpty == false ? fiberContent : NSNull()

            let _ = try await APIClient.shared.patch(
                "/patterns/\(patternId)/yarns/\(yarnId)",
                body: body
            )
            await load(patternId: patternId)
            await estimateGauge()
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deleteYarn(yarnId: String) async {
        guard let patternId else { return }
        do {
            struct Empty: Decodable {}
            let _: APIResponse<Empty> = try await APIClient.shared.delete(
                "/patterns/\(patternId)/yarns/\(yarnId)"
            )
            await load(patternId: patternId)
            await estimateGauge()
        } catch {
            self.error = error.localizedDescription
        }
    }

    func estimateGauge() async {
        guard let yarns = pattern?.patternYarns, !yarns.isEmpty else {
            gaugeEstimate = nil
            return
        }

        // Only estimate if all yarns have a weight set
        let yarnsWithWeight = yarns.filter { $0.weight != nil }
        guard !yarnsWithWeight.isEmpty else {
            gaugeEstimate = nil
            return
        }

        do {
            let input = yarnsWithWeight.map { ["weight": $0.weight!, "strands": $0.strands] as [String: Any] }
            let data = try await APIClient.shared.post(
                "/gauge/estimate",
                body: ["yarns": input]
            )
            let response = try JSONDecoder.iso8601.decode(APIResponse<GaugeEstimate>.self, from: data)
            gaugeEstimate = response.data
        } catch {
            // Non-critical — don't show error
            gaugeEstimate = nil
        }
    }

    // MARK: - Row CRUD

    func addRow(sectionId: String, instruction: String, rowType: String?, rowsInStep: Int?, stitchCount: Int?, isRepeat: Bool, repeatCount: Int?, rowsPerRepeat: Int?, targetMeasurementCm: Double?, notes: String?) async {
        guard let patternId else { return }
        do {
            var body: [String: Any] = ["instruction": instruction]
            if let rt = rowType { body["row_type"] = rt }
            if let ris = rowsInStep { body["rows_in_step"] = ris }
            if let sc = stitchCount { body["stitch_count"] = sc }
            if isRepeat { body["is_repeat"] = true }
            if let rc = repeatCount { body["repeat_count"] = rc }
            if let rpr = rowsPerRepeat { body["rows_per_repeat"] = rpr }
            if let tm = targetMeasurementCm { body["target_measurement_cm"] = tm }
            if let n = notes, !n.isEmpty { body["notes"] = n }

            let _ = try await APIClient.shared.post(
                "/patterns/\(patternId)/sections/\(sectionId)/rows",
                body: body
            )
            await load(patternId: patternId)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func updateRow(sectionId: String, rowId: String, instruction: String, rowType: String?, rowsInStep: Int?, stitchCount: Int?, isRepeat: Bool, repeatCount: Int?, rowsPerRepeat: Int?, targetMeasurementCm: Double?, notes: String?) async {
        guard let patternId else { return }
        do {
            var body: [String: Any] = ["instruction": instruction]
            body["row_type"] = rowType as Any
            body["rows_in_step"] = rowsInStep as Any
            body["stitch_count"] = stitchCount as Any
            body["is_repeat"] = isRepeat
            body["repeat_count"] = repeatCount as Any
            body["rows_per_repeat"] = rowsPerRepeat as Any
            body["target_measurement_cm"] = targetMeasurementCm as Any
            body["notes"] = ((notes?.isEmpty ?? true) ? NSNull() : notes!) as Any

            let _ = try await APIClient.shared.patch(
                "/patterns/\(patternId)/sections/\(sectionId)/rows/\(rowId)",
                body: body
            )
            await load(patternId: patternId)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deleteRow(sectionId: String, rowId: String) async {
        guard let patternId else { return }
        do {
            struct Empty: Decodable {}
            let _: APIResponse<Empty> = try await APIClient.shared.delete(
                "/patterns/\(patternId)/sections/\(sectionId)/rows/\(rowId)"
            )
            await load(patternId: patternId)
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - PDF Export

    func exportPdf() async -> Data? {
        guard let patternId else { return nil }
        isExportingPdf = true
        defer { isExportingPdf = false }
        do {
            let data = try await APIClient.shared.rawPost(
                "/pdf/generate",
                body: ["pattern_id": patternId]
            )
            return data
        } catch {
            self.error = error.localizedDescription
            return nil
        }
    }

    // MARK: - Photo Upload

    func uploadCoverPhoto(imageData: Data) async {
        guard let patternId else { return }
        isUploadingPhoto = true
        defer { isUploadingPhoto = false }
        do {
            struct CoverResponse: Decodable { let id: String; let coverImageUrl: String? }
            let response: APIResponse<CoverResponse> = try await APIClient.shared.upload(
                "/patterns/\(patternId)/cover",
                imageData: imageData,
                mimeType: "image/jpeg",
                fileName: "cover.jpg",
                method: "PUT"
            )
            coverImageUrl = response.data.coverImageUrl
        } catch is CancellationError {
            // View dismissed
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Yarn from Stash

    func addYarnFromStash(stashItemId: String) async {
        do {
            let response: APIResponse<StashItem> = try await APIClient.shared.get("/stash/\(stashItemId)")
            let item = response.data
            let name: String
            if let company = item.yarn?.company?.name, let yarnName = item.yarn?.name {
                name = "\(company) \(yarnName)"
            } else {
                name = item.yarn?.name ?? "Unknown yarn"
            }
            await addYarn(
                name: name,
                weight: item.yarn?.weight,
                colorway: item.colorway,
                fiberContent: item.yarn?.fiberContent,
                strands: 1
            )
        } catch is CancellationError {
            // View dismissed
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Needle Management

    func addNeedleFromCollection(needleId: String) async {
        do {
            let response: APIResponse<Needle> = try await APIClient.shared.get("/needles/\(needleId)")
            let needle = response.data
            var entry = PatternNeedleEntry()
            entry.type = needle.type
            entry.sizeMm = needle.sizeMm
            entry.lengthCm = needle.lengthCm
            entry.material = needle.material
            entry.brand = needle.brand
            entry.fromCollection = true
            entry.needleId = needle.id
            patternNeedles.append(entry)
        } catch is CancellationError {
            // View dismissed
        } catch {
            self.error = error.localizedDescription
        }
    }

    func removeNeedle(at index: Int) {
        guard patternNeedles.indices.contains(index) else { return }
        patternNeedles.remove(at: index)
    }

    // MARK: - Computed

    /// Sections that are size-agnostic (no size_id — the "shell" sections, or manually-created)
    var builderSections: [PatternSection] {
        pattern?.sections?.filter { section in
            // Show sections without size_id (user-built or shell sections)
            // For size-specific sections, they'd have a size reference — we only show the editable ones
            // Since the API returns all sections, we filter to size_id == nil (the builder's sections)
            true // For now show all — the API doesn't expose size_id to iOS, so we show everything
        } ?? []
    }
}

// MARK: - View

struct PatternBuilderView: View {
    var patternId: String?
    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = PatternBuilderViewModel()
    @State private var showAddSection = false
    @State private var newSectionName = ""
    @State private var sectionToRename: PatternSection?
    @State private var renameText = ""
    @State private var sectionToDelete: PatternSection?
    @State private var addStepSection: PatternSection?
    @State private var editingStep: EditingStep?
    @State private var showMetadataSaved = false
    @State private var showShareSheet = false
    @State private var exportedPdfData: Data?
    @State private var showAddYarn = false
    @State private var editingYarn: PatternYarn?
    @State private var yarnToDelete: PatternYarn?
    @State private var showStashPicker = false
    @State private var showNeedlePicker = false
    @State private var showAddNeedle = false
    @State private var showPdfViewer = false
    @State private var generatedPdfData: Data?
    @State private var photoSelection: PhotosPickerItem?
    @Environment(\.dismiss) private var dismiss

    struct EditingStep: Identifiable {
        var id: String { row?.id ?? "new" }
        let section: PatternSection
        let row: PatternInstruction?
    }

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.pattern == nil && !viewModel.isDraft {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 24) {
                        metadataSection
                        if !viewModel.isDraft {
                            coverPhotoSection
                            yarnsSection
                            needlesSection
                            sectionsEditor
                            actionsSection
                        }
                    }
                    .padding(.bottom, 40)
                }
            }
        }
        .navigationTitle(viewModel.isDraft ? "New pattern" : "Pattern builder")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if let patternId {
                await viewModel.load(patternId: patternId)
            } else {
                await viewModel.autoFillDesigner()
            }
        }
        .alert("New section", isPresented: $showAddSection) {
            TextField("Section name", text: $newSectionName)
            Button("Cancel", role: .cancel) { newSectionName = "" }
            Button("Add") {
                let name = newSectionName.trimmingCharacters(in: .whitespaces)
                newSectionName = ""
                guard !name.isEmpty else { return }
                Task { await viewModel.addSection(name: name) }
            }
        } message: {
            Text("Enter a name for this section (e.g., Body, Sleeves, Brim).")
        }
        .alert("Rename section", isPresented: .init(
            get: { sectionToRename != nil },
            set: { if !$0 { sectionToRename = nil } }
        )) {
            TextField("Section name", text: $renameText)
            Button("Cancel", role: .cancel) { sectionToRename = nil }
            Button("Rename") {
                guard let section = sectionToRename else { return }
                let name = renameText.trimmingCharacters(in: .whitespaces)
                sectionToRename = nil
                guard !name.isEmpty else { return }
                Task { await viewModel.renameSection(section.id, to: name) }
            }
        }
        .confirmationDialog(
            "Delete section?",
            isPresented: .init(
                get: { sectionToDelete != nil },
                set: { if !$0 { sectionToDelete = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Delete section and all steps", role: .destructive) {
                guard let section = sectionToDelete else { return }
                sectionToDelete = nil
                Task { await viewModel.deleteSection(section.id) }
            }
            Button("Cancel", role: .cancel) { sectionToDelete = nil }
        } message: {
            Text("This will permanently delete this section and all its instruction steps.")
        }
        .sheet(item: $addStepSection) { section in
            StepEditorSheet(
                sectionName: section.name,
                existingRow: nil,
                onSave: { instruction, rowType, rowsInStep, stitchCount, isRepeat, repeatCount, rowsPerRepeat, targetMeasurement, notes in
                    Task {
                        await viewModel.addRow(
                            sectionId: section.id,
                            instruction: instruction,
                            rowType: rowType,
                            rowsInStep: rowsInStep,
                            stitchCount: stitchCount,
                            isRepeat: isRepeat,
                            repeatCount: repeatCount,
                            rowsPerRepeat: rowsPerRepeat,
                            targetMeasurementCm: targetMeasurement,
                            notes: notes
                        )
                    }
                }
            )
        }
        .sheet(item: $editingStep) { step in
            StepEditorSheet(
                sectionName: step.section.name,
                existingRow: step.row,
                onSave: { instruction, rowType, rowsInStep, stitchCount, isRepeat, repeatCount, rowsPerRepeat, targetMeasurement, notes in
                    if let row = step.row {
                        Task {
                            await viewModel.updateRow(
                                sectionId: step.section.id,
                                rowId: row.id,
                                instruction: instruction,
                                rowType: rowType,
                                rowsInStep: rowsInStep,
                                stitchCount: stitchCount,
                                isRepeat: isRepeat,
                                repeatCount: repeatCount,
                                rowsPerRepeat: rowsPerRepeat,
                                targetMeasurementCm: targetMeasurement,
                                notes: notes
                            )
                        }
                    }
                },
                onDelete: step.row != nil ? {
                    if let row = step.row {
                        Task { await viewModel.deleteRow(sectionId: step.section.id, rowId: row.id) }
                    }
                } : nil
            )
        }
        .sheet(isPresented: $showShareSheet) {
            if let data = exportedPdfData {
                let url = FileManager.default.temporaryDirectory.appendingPathComponent("\(viewModel.title).pdf")
                let _ = try? data.write(to: url)
                ShareSheet(items: [url])
            }
        }
        .sheet(isPresented: $showAddYarn) {
            YarnEditorSheet(existingYarn: nil) { name, weight, colorway, fiber, strands in
                Task { await viewModel.addYarn(name: name, weight: weight, colorway: colorway, fiberContent: fiber, strands: strands) }
            }
        }
        .sheet(item: $editingYarn) { yarn in
            YarnEditorSheet(existingYarn: yarn) { name, weight, colorway, fiber, strands in
                Task { await viewModel.updateYarn(yarnId: yarn.id, name: name, weight: weight, colorway: colorway, fiberContent: fiber, strands: strands) }
            } onDelete: {
                Task { await viewModel.deleteYarn(yarnId: yarn.id) }
            }
        }
        .sheet(isPresented: $showStashPicker) {
            StashPickerSheet { stashItemId in
                Task { await viewModel.addYarnFromStash(stashItemId: stashItemId) }
            }
        }
        .sheet(isPresented: $showNeedlePicker) {
            NeedlePickerSheet { needleId in
                Task { await viewModel.addNeedleFromCollection(needleId: needleId) }
            }
        }
        .sheet(isPresented: $showAddNeedle) {
            NeedleEditorSheet { entry in
                viewModel.patternNeedles.append(entry)
            }
        }
        .sheet(isPresented: $showPdfViewer) {
            if let data = generatedPdfData {
                NavigationStack {
                    PDFDataViewerView(pdfData: data, fileName: viewModel.title)
                        .toolbar {
                            ToolbarItem(placement: .cancellationAction) {
                                Button("Done") { showPdfViewer = false }
                            }
                        }
                }
            }
        }
        .errorAlert(error: $viewModel.error)
        .onChange(of: photoSelection) { _, newValue in
            guard let newValue else { return }
            Task {
                if let data = try? await newValue.loadTransferable(type: Data.self) {
                    await viewModel.uploadCoverPhoto(imageData: data)
                }
                photoSelection = nil
            }
        }
    }

    // MARK: - Cover Photo

    private var coverPhotoSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Cover photo")
                .font(.headline)
                .padding(.horizontal)

            if let urlString = viewModel.coverImageUrl, let url = URL(string: urlString) {
                ZStack(alignment: .topTrailing) {
                    AsyncImage(url: url) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Color.secondary.opacity(0.15)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 200)
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                    PhotosPicker(selection: $photoSelection, matching: .images) {
                        Image(systemName: "pencil.circle.fill")
                            .font(.title2)
                            .symbolRenderingMode(.palette)
                            .foregroundStyle(.white, theme.primary)
                    }
                    .padding(8)
                }
                .padding(.horizontal)
            } else {
                PhotosPicker(selection: $photoSelection, matching: .images) {
                    VStack(spacing: 8) {
                        if viewModel.isUploadingPhoto {
                            ProgressView()
                        } else {
                            Image(systemName: "photo.badge.plus")
                                .font(.system(size: 30))
                                .foregroundStyle(.quaternary)
                        }
                        Text(viewModel.isUploadingPhoto ? "Uploading..." : "Add a cover photo")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 32)
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(viewModel.isUploadingPhoto)
                .padding(.horizontal)
            }
        }
    }

    // MARK: - Metadata Section

    private let garmentTypes = [
        ("hat", "Hat"), ("beanie", "Beanie"), ("sweater", "Sweater"),
        ("cardigan", "Cardigan"), ("vest", "Vest"), ("socks", "Socks"),
        ("mittens", "Mittens"), ("gloves", "Gloves"), ("scarf", "Scarf"),
        ("cowl", "Cowl"), ("shawl", "Shawl"), ("blanket", "Blanket"),
        ("top", "Top"), ("dress", "Dress"), ("skirt", "Skirt"),
        ("bag", "Bag"), ("toy", "Toy"), ("other", "Other"),
    ]

    private let yarnWeights = [
        ("lace", "Lace"), ("fingering", "Fingering"), ("sport", "Sport"),
        ("dk", "DK"), ("worsted", "Worsted"), ("aran", "Aran"),
        ("bulky", "Bulky"), ("super_bulky", "Super bulky"),
    ]

    private let needleSizes: [Double] = [
        2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.5,
        5.0, 5.5, 6.0, 6.5, 7.0, 8.0, 9.0, 10.0, 12.0, 15.0,
    ]

    private let gaugePatterns = [
        ("stockinette", "Stockinette"), ("garter", "Garter"),
        ("seed", "Seed stitch"), ("rib_1x1", "1×1 rib"),
        ("rib_2x2", "2×2 rib"), ("moss", "Moss stitch"),
        ("cables", "Cables"),
    ]

    @State private var showDescription = true

    private var metadataSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Details")
                .font(.headline)
                .padding(.horizontal)

            VStack(alignment: .leading, spacing: 16) {
                // Title
                LabeledTextField(label: "Title", text: $viewModel.title, placeholder: "Pattern name")

                // Craft type + difficulty
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Craft").font(.caption).foregroundStyle(.secondary)
                        Picker("Craft", selection: $viewModel.craftType) {
                            Text("Knitting").tag("knitting")
                            Text("Crochet").tag("crochet")
                        }
                        .pickerStyle(.segmented)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Difficulty").font(.caption).foregroundStyle(.secondary)
                        Picker("Difficulty", selection: $viewModel.difficulty) {
                            Text("—").tag("")
                            Text("Beginner").tag("beginner")
                            Text("Easy").tag("easy")
                            Text("Intermediate").tag("intermediate")
                            Text("Advanced").tag("advanced")
                            Text("Expert").tag("experienced")
                        }
                        .pickerStyle(.menu)
                    }
                }

                // Project type — pill picker
                VStack(alignment: .leading, spacing: 6) {
                    Text("Project type").font(.caption).foregroundStyle(.secondary)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(garmentTypes, id: \.0) { value, label in
                                metadataPill(
                                    label,
                                    isSelected: viewModel.garmentType == value,
                                    action: { viewModel.garmentType = viewModel.garmentType == value ? "" : value }
                                )
                            }
                        }
                    }
                }

                LabeledTextField(label: "Designer", text: $viewModel.designerName, placeholder: "Your name")

                // Yarn weight — pill picker
                VStack(alignment: .leading, spacing: 6) {
                    Text("Yarn weight").font(.caption).foregroundStyle(.secondary)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(yarnWeights, id: \.0) { value, label in
                                metadataPill(
                                    label,
                                    isSelected: viewModel.yarnWeight == value,
                                    action: {
                                        viewModel.yarnWeight = viewModel.yarnWeight == value ? "" : value
                                        autoFillGauge()
                                    }
                                )
                            }
                        }
                    }
                }

                // Needle size — scrollable picker
                VStack(alignment: .leading, spacing: 6) {
                    Text("Needle size").font(.caption).foregroundStyle(.secondary)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(needleSizes, id: \.self) { size in
                                let sizeStr = size.truncatingRemainder(dividingBy: 1) == 0
                                    ? String(format: "%.0f", size) : String(format: "%.2g", size)
                                let currentValue = Double(viewModel.needleSizeMm) ?? -1
                                let isSelected = abs(currentValue - size) < 0.01

                                Button {
                                    viewModel.needleSizeMm = sizeStr
                                } label: {
                                    Text("\(sizeStr)mm")
                                        .font(.caption.weight(isSelected ? .semibold : .regular))
                                        .foregroundStyle(isSelected ? .white : .primary)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(
                                            isSelected ? AnyShapeStyle(theme.primary) : AnyShapeStyle(Color(.secondarySystemGroupedBackground)),
                                            in: Capsule()
                                        )
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }

                // Gauge — compact row with auto-fill
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("Gauge").font(.caption).foregroundStyle(.secondary)
                        Spacer()
                        if !viewModel.yarnWeight.isEmpty {
                            Button("Auto-fill") { autoFillGauge() }
                                .font(.caption2.weight(.medium))
                                .foregroundStyle(theme.primary)
                                .buttonStyle(.plain)
                        }
                    }
                    HStack(spacing: 12) {
                        HStack(spacing: 4) {
                            TextField("18", text: $viewModel.gaugeStitches)
                                .keyboardType(.decimalPad)
                                .multilineTextAlignment(.center)
                                .frame(width: 50)
                                .padding(.vertical, 8)
                                .background(Color(.secondarySystemGroupedBackground))
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                            Text("sts")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        HStack(spacing: 4) {
                            TextField("24", text: $viewModel.gaugeRows)
                                .keyboardType(.decimalPad)
                                .multilineTextAlignment(.center)
                                .frame(width: 50)
                                .padding(.vertical, 8)
                                .background(Color(.secondarySystemGroupedBackground))
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                            Text("rows / 10cm")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                // Gauge pattern — pill picker
                VStack(alignment: .leading, spacing: 6) {
                    Text("Gauge stitch").font(.caption).foregroundStyle(.secondary)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(gaugePatterns, id: \.0) { value, label in
                                metadataPill(
                                    label,
                                    isSelected: viewModel.gaugePattern == value,
                                    action: { viewModel.gaugePattern = viewModel.gaugePattern == value ? "" : value }
                                )
                            }
                        }
                    }
                }

                // Description
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("Description")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Spacer()
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) { showDescription.toggle() }
                        } label: {
                            Image(systemName: showDescription ? "chevron.up" : "chevron.down")
                                .font(.caption2)
                                .foregroundStyle(.tertiary)
                        }
                        .buttonStyle(.plain)
                    }

                    if showDescription || !viewModel.description.isEmpty {
                        TextEditor(text: $viewModel.description)
                            .frame(minHeight: 60, maxHeight: 120)
                            .padding(8)
                            .background(Color(.secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }

                // Save metadata button
                Button {
                    Task { await viewModel.saveMetadata() }
                } label: {
                    HStack {
                        if viewModel.isSaving {
                            ProgressView().controlSize(.small).tint(.white)
                        }
                        Text(viewModel.isDraft ? "Create pattern" : "Save details")
                            .fontWeight(.medium)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(theme.primary, in: RoundedRectangle(cornerRadius: 10))
                    .foregroundStyle(.white)
                }
                .disabled(viewModel.isSaving || viewModel.title.trimmingCharacters(in: .whitespaces).isEmpty)
                .buttonStyle(.plain)
            }
            .padding(.horizontal)
        }
    }

    private func metadataPill(_ label: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.caption.weight(isSelected ? .semibold : .regular))
                .foregroundStyle(isSelected ? .white : .primary)
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(
                    isSelected ? AnyShapeStyle(theme.primary) : AnyShapeStyle(Color(.secondarySystemGroupedBackground)),
                    in: Capsule()
                )
        }
        .buttonStyle(.plain)
    }

    private func autoFillGauge() {
        let gaugeDefaults: [String: (sts: String, rows: String, needle: String)] = [
            "lace": ("32", "40", "2.25"),
            "fingering": ("28", "36", "2.75"),
            "sport": ("24", "32", "3.75"),
            "dk": ("22", "28", "4"),
            "worsted": ("18", "24", "5"),
            "aran": ("16", "22", "5.5"),
            "bulky": ("14", "18", "8"),
            "super_bulky": ("10", "14", "10"),
        ]
        if let defaults = gaugeDefaults[viewModel.yarnWeight] {
            viewModel.gaugeStitches = defaults.sts
            viewModel.gaugeRows = defaults.rows
            if viewModel.needleSizeMm.isEmpty {
                viewModel.needleSizeMm = defaults.needle
            }
        }
    }

    // MARK: - Yarns Section

    private var yarnsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Yarns")
                    .font(.headline)
                Spacer()
                Menu {
                    Button { showAddYarn = true } label: {
                        Label("Add manually", systemImage: "plus.circle")
                    }
                    Button { showStashPicker = true } label: {
                        Label("From stash", systemImage: "tray.full")
                    }
                } label: {
                    Label("Add yarn", systemImage: "plus.circle")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(theme.primary)
                }
            }
            .padding(.horizontal)

            if let yarns = viewModel.pattern?.patternYarns, !yarns.isEmpty {
                ForEach(yarns) { yarn in
                    yarnCard(yarn)
                }

                // Gauge estimate
                if let estimate = viewModel.gaugeEstimate {
                    gaugeEstimateCard(estimate)
                }
            } else {
                VStack(spacing: 8) {
                    Image(systemName: "tag")
                        .font(.system(size: 30))
                        .foregroundStyle(.quaternary)
                    Text("No yarns yet")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text("Add yarns to get an estimated gauge for stranded combinations")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
            }
        }
    }

    private func yarnCard(_ yarn: PatternYarn) -> some View {
        Button {
            editingYarn = yarn
        } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Text(yarn.name)
                            .font(.subheadline.weight(.medium))
                        if yarn.strands > 1 {
                            Text("×\(yarn.strands)")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(theme.primary, in: Capsule())
                        }
                    }
                    HStack(spacing: 8) {
                        if let weight = yarn.weight {
                            Text(weight.replacingOccurrences(of: "_", with: " ").capitalized)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        if let fiber = yarn.fiberContent {
                            Text(fiber)
                                .font(.caption)
                                .foregroundStyle(.tertiary)
                        }
                    }
                    if let colorway = yarn.colorway, !colorway.isEmpty {
                        Text(colorway)
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }

                Spacer(minLength: 0)

                Image(systemName: "chevron.right")
                    .font(.caption2)
                    .foregroundStyle(.quaternary)
            }
            .padding(12)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
        .padding(.horizontal)
    }

    private func gaugeEstimateCard(_ estimate: GaugeEstimate) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: "ruler")
                    .font(.caption)
                    .foregroundStyle(theme.primary)
                Text("Estimated gauge")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(theme.primary)
                Spacer()
                Text(estimate.effectiveWeightLabel.capitalized + " weight")
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 16) {
                VStack(spacing: 2) {
                    Text("\(Int(estimate.stitchesPer10cm.min))–\(Int(estimate.stitchesPer10cm.max))")
                        .font(.subheadline.weight(.semibold).monospacedDigit())
                    Text("sts/10cm")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                VStack(spacing: 2) {
                    Text("\(Int(estimate.rowsPer10cm.min))–\(Int(estimate.rowsPer10cm.max))")
                        .font(.subheadline.weight(.semibold).monospacedDigit())
                    Text("rows/10cm")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                VStack(spacing: 2) {
                    Text("\(String(format: "%.1f", estimate.needleSizeMm.min))–\(String(format: "%.1f", estimate.needleSizeMm.max))")
                        .font(.subheadline.weight(.semibold).monospacedDigit())
                    Text("mm needles")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity)

            Button {
                // Apply estimate midpoints to the gauge fields
                viewModel.gaugeStitches = String(Int(estimate.stitchesPer10cm.midpoint))
                viewModel.gaugeRows = String(Int(estimate.rowsPer10cm.midpoint))
                viewModel.needleSizeMm = String(format: "%.1f", estimate.needleSizeMm.midpoint)
                viewModel.yarnWeight = estimate.effectiveWeight.replacingOccurrences(of: "_", with: " ")
            } label: {
                Text("Apply to pattern")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(theme.primary)
            }
            .buttonStyle(.plain)
        }
        .padding(12)
        .background(theme.primary.opacity(0.06), in: RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(theme.primary.opacity(0.2), lineWidth: 1)
        )
        .padding(.horizontal)
    }

    // MARK: - Needles Section

    private var needlesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Needles")
                    .font(.headline)
                Spacer()
                Menu {
                    Button { showAddNeedle = true } label: {
                        Label("Add manually", systemImage: "plus.circle")
                    }
                    Button { showNeedlePicker = true } label: {
                        Label("From collection", systemImage: "tray.full")
                    }
                } label: {
                    Label("Add needle", systemImage: "plus.circle")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(theme.primary)
                }
            }
            .padding(.horizontal)

            if viewModel.patternNeedles.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "pin")
                        .font(.system(size: 30))
                        .foregroundStyle(.quaternary)
                    Text("No needles yet")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
            } else {
                ForEach(Array(viewModel.patternNeedles.enumerated()), id: \.element.id) { index, needle in
                    needleCard(index: index, needle: needle)
                }
            }
        }
    }

    private func needleCard(index: Int, needle: PatternNeedleEntry) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text("\(String(format: "%.1f", needle.sizeMm))mm")
                        .font(.subheadline.weight(.medium))
                    Text(needle.type.replacingOccurrences(of: "_", with: " ").capitalized)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                HStack(spacing: 8) {
                    if let material = needle.material {
                        Text(material)
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                    if let brand = needle.brand {
                        Text(brand)
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                    if let length = needle.lengthCm {
                        Text("\(length)cm")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                }
            }

            Spacer(minLength: 0)

            Button {
                viewModel.removeNeedle(at: index)
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(.tertiary)
            }
            .buttonStyle(.plain)
        }
        .padding(12)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .padding(.horizontal)
    }

    // MARK: - Sections Editor

    private var sectionsEditor: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Sections")
                    .font(.headline)
                Spacer()
                Button { showAddSection = true } label: {
                    Label("Add section", systemImage: "plus.circle")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(theme.primary)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal)

            if viewModel.builderSections.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "text.badge.plus")
                        .font(.system(size: 30))
                        .foregroundStyle(.quaternary)
                    Text("No sections yet")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text("Add sections like Body, Sleeves, Brim to structure your pattern")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
            } else {
                ForEach(viewModel.builderSections) { section in
                    sectionCard(section)
                }
            }
        }
    }

    private func sectionCard(_ section: PatternSection) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // Section header
            HStack {
                Image(systemName: "line.3.horizontal")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                Text(section.name)
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Menu {
                    Button {
                        renameText = section.name
                        sectionToRename = section
                    } label: {
                        Label("Rename", systemImage: "pencil")
                    }
                    Button(role: .destructive) {
                        sectionToDelete = section
                    } label: {
                        Label("Delete section", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(width: 30, height: 30)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Color(.systemGray5).opacity(0.5))

            // Steps
            if let rows = section.rows, !rows.isEmpty {
                ForEach(rows) { row in
                    Button {
                        editingStep = EditingStep(section: section, row: row)
                    } label: {
                        stepRow(row)
                    }
                    .buttonStyle(.plain)

                    if row.id != rows.last?.id {
                        Divider().padding(.leading, 40)
                    }
                }
            }

            // Add step button
            Button {
                addStepSection = section
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "plus")
                        .font(.caption)
                    Text("Add step")
                        .font(.caption.weight(.medium))
                }
                .foregroundStyle(theme.primary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
            }
            .buttonStyle(.plain)
        }
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }

    private func stepRow(_ row: PatternInstruction) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Text("\(row.rowNumber)")
                .font(.caption.weight(.semibold).monospacedDigit())
                .foregroundStyle(.secondary)
                .frame(width: 24, alignment: .trailing)

            VStack(alignment: .leading, spacing: 3) {
                if let rowType = row.rowType {
                    HStack(spacing: 4) {
                        Text(stepTypeLabel(rowType))
                            .font(.system(size: 9, weight: .semibold))
                            .textCase(.uppercase)
                            .foregroundStyle(stepTypeColor(rowType))
                        if row.isRepeat == true, let rc = row.repeatCount, let rpr = row.rowsPerRepeat {
                            Text("\(rc) x \(rpr)")
                                .font(.system(size: 9, weight: .medium))
                                .foregroundStyle(.secondary)
                        } else if let ris = row.rowsInStep, ris > 1 {
                            Text("\(ris) rows")
                                .font(.system(size: 9, weight: .medium))
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                Text(row.instruction)
                    .font(.caption)
                    .foregroundStyle(.primary)
                    .lineLimit(3)

                if let count = row.stitchCount {
                    Text("\(count) sts")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }

            Spacer(minLength: 0)

            Image(systemName: "chevron.right")
                .font(.caption2)
                .foregroundStyle(.quaternary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .contentShape(Rectangle())
    }

    private func stepTypeLabel(_ type: String) -> String {
        switch type {
        case "setup": return "Setup"
        case "work_rows": return "Work rows"
        case "repeat": return "Repeat"
        case "work_to_measurement": return "Measure"
        case "finishing": return "Finishing"
        default: return type
        }
    }

    private func stepTypeColor(_ type: String) -> Color {
        switch type {
        case "setup": return .blue
        case "work_rows": return .primary
        case "repeat": return .purple
        case "work_to_measurement": return .orange
        case "finishing": return .green
        default: return .secondary
        }
    }

    // MARK: - Actions

    /// True if the pattern has sections with rows (Type 1 — built in-app)
    private var hasSectionsWithRows: Bool {
        viewModel.builderSections.contains { section in
            section.rows != nil && !(section.rows?.isEmpty ?? true)
        }
    }

    private var actionsSection: some View {
        VStack(spacing: 10) {
            if hasSectionsWithRows {
                // Type 1: built pattern — auto-generate PDF
                Button {
                    Task {
                        if let data = await viewModel.exportPdf() {
                            generatedPdfData = data
                            showPdfViewer = true
                        }
                    }
                } label: {
                    HStack {
                        if viewModel.isExportingPdf {
                            ProgressView().controlSize(.small)
                        } else {
                            Image(systemName: "doc.text")
                        }
                        Text("View PDF")
                            .fontWeight(.medium)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(theme.primary, in: RoundedRectangle(cornerRadius: 10))
                    .foregroundStyle(.white)
                }
                .disabled(viewModel.isExportingPdf)
                .buttonStyle(.plain)
            }

            // Export / share PDF
            if hasSectionsWithRows {
                Button {
                    Task {
                        if let data = await viewModel.exportPdf() {
                            exportedPdfData = data
                            showShareSheet = true
                        }
                    }
                } label: {
                    HStack {
                        if viewModel.isExportingPdf {
                            ProgressView().controlSize(.small)
                        } else {
                            Image(systemName: "square.and.arrow.up")
                        }
                        Text("Download PDF")
                            .fontWeight(.medium)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .disabled(viewModel.isExportingPdf)
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal)
    }
}

// MARK: - Step Editor Sheet

struct StepEditorSheet: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss

    let sectionName: String
    let existingRow: PatternInstruction?
    let onSave: (String, String?, Int?, Int?, Bool, Int?, Int?, Double?, String?) -> Void
    var onDelete: (() -> Void)?

    @State private var instruction = ""
    @State private var rowType = ""
    @State private var rowsInStepText = ""
    @State private var stitchCountText = ""
    @State private var isRepeat = false
    @State private var repeatCountText = ""
    @State private var rowsPerRepeatText = ""
    @State private var targetMeasurementText = ""
    @State private var notes = ""
    @State private var showDeleteConfirm = false

    private var isEditing: Bool { existingRow != nil }

    var body: some View {
        NavigationStack {
            Form {
                Section("Instruction") {
                    TextEditor(text: $instruction)
                        .frame(minHeight: 80)
                }

                Section("Step type") {
                    Picker("Type", selection: $rowType) {
                        Text("None").tag("")
                        Text("Setup (cast on, join, markers)").tag("setup")
                        Text("Work rows").tag("work_rows")
                        Text("Repeat block").tag("repeat")
                        Text("Work to measurement").tag("work_to_measurement")
                        Text("Finishing (bind off, seam)").tag("finishing")
                    }
                    .pickerStyle(.navigationLink)

                    if rowType == "work_rows" || rowType == "" {
                        HStack {
                            Text("Rows in step")
                            Spacer()
                            TextField("1", text: $rowsInStepText)
                                .keyboardType(.numberPad)
                                .multilineTextAlignment(.trailing)
                                .frame(width: 60)
                        }
                    }

                    if rowType == "repeat" {
                        HStack {
                            Text("Repeat count")
                            Spacer()
                            TextField("e.g., 12", text: $repeatCountText)
                                .keyboardType(.numberPad)
                                .multilineTextAlignment(.trailing)
                                .frame(width: 60)
                        }
                        HStack {
                            Text("Rows per repeat")
                            Spacer()
                            TextField("e.g., 2", text: $rowsPerRepeatText)
                                .keyboardType(.numberPad)
                                .multilineTextAlignment(.trailing)
                                .frame(width: 60)
                        }
                    }

                    if rowType == "work_to_measurement" {
                        HStack {
                            Text("Target (cm)")
                            Spacer()
                            TextField("e.g., 40", text: $targetMeasurementText)
                                .keyboardType(.decimalPad)
                                .multilineTextAlignment(.trailing)
                                .frame(width: 60)
                        }
                    }
                }

                Section("Stitch count") {
                    HStack {
                        Text("Stitches after this step")
                        Spacer()
                        TextField("—", text: $stitchCountText)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 60)
                    }
                }

                Section("Notes") {
                    TextField("Optional notes or tips", text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                }

                if isEditing, let onDelete {
                    Section {
                        Button("Delete step", role: .destructive) {
                            showDeleteConfirm = true
                        }
                    }
                }
            }
            .navigationTitle(isEditing ? "Edit step" : "Add step")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        save()
                        dismiss()
                    }
                    .disabled(instruction.trimmingCharacters(in: .whitespaces).isEmpty)
                    .fontWeight(.semibold)
                }
            }
            .confirmationDialog("Delete this step?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
                Button("Delete", role: .destructive) {
                    onDelete?()
                    dismiss()
                }
                Button("Cancel", role: .cancel) {}
            }
            .onAppear { populateFromExisting() }
        }
        .presentationDetents([.large])
    }

    private func populateFromExisting() {
        guard let row = existingRow else { return }
        instruction = row.instruction
        rowType = row.rowType ?? ""
        rowsInStepText = row.rowsInStep.map { String($0) } ?? ""
        stitchCountText = row.stitchCount.map { String($0) } ?? ""
        isRepeat = row.isRepeat ?? false
        repeatCountText = row.repeatCount.map { String($0) } ?? ""
        rowsPerRepeatText = row.rowsPerRepeat.map { String($0) } ?? ""
        targetMeasurementText = row.targetMeasurementCm.map { String($0) } ?? ""
        notes = row.notes ?? ""
    }

    private func save() {
        let type = rowType.isEmpty ? nil : rowType
        let ris: Int?
        if type == "repeat" {
            let rc = Int(repeatCountText)
            let rpr = Int(rowsPerRepeatText)
            isRepeat = true
            ris = (rc != nil && rpr != nil) ? rc! * rpr! : nil
        } else if type == "setup" || type == "finishing" {
            ris = 1
        } else if type == "work_to_measurement" {
            ris = nil
        } else {
            ris = Int(rowsInStepText)
        }

        onSave(
            instruction.trimmingCharacters(in: .whitespaces),
            type,
            ris,
            Int(stitchCountText),
            type == "repeat",
            Int(repeatCountText),
            Int(rowsPerRepeatText),
            Double(targetMeasurementText),
            notes.trimmingCharacters(in: .whitespaces)
        )
    }
}

// MARK: - Yarn Editor Sheet

struct YarnEditorSheet: View {
    @Environment(\.dismiss) private var dismiss
    let existingYarn: PatternYarn?
    let onSave: (String, String?, String?, String?, Int) -> Void
    var onDelete: (() -> Void)?

    @State private var name = ""
    @State private var weight = ""
    @State private var colorway = ""
    @State private var fiberContent = ""
    @State private var strands = 1
    @State private var showDeleteConfirm = false

    private var isEditing: Bool { existingYarn != nil }

    private let weights = [
        ("", "Not specified"),
        ("lace", "Lace"),
        ("fingering", "Fingering"),
        ("sport", "Sport"),
        ("dk", "DK"),
        ("worsted", "Worsted"),
        ("aran", "Aran"),
        ("bulky", "Bulky"),
        ("super_bulky", "Super Bulky"),
    ]

    var body: some View {
        NavigationStack {
            Form {
                Section("Yarn details") {
                    TextField("Yarn name", text: $name)
                    Picker("Weight", selection: $weight) {
                        ForEach(weights, id: \.0) { value, label in
                            Text(label).tag(value)
                        }
                    }
                    TextField("Colorway", text: $colorway)
                    TextField("Fiber content", text: $fiberContent)
                }

                Section("Strands") {
                    Stepper("Held together: \(strands) strand\(strands == 1 ? "" : "s")", value: $strands, in: 1...10)
                }

                if isEditing, let onDelete {
                    Section {
                        Button("Remove yarn", role: .destructive) {
                            showDeleteConfirm = true
                        }
                    }
                }
            }
            .navigationTitle(isEditing ? "Edit yarn" : "Add yarn")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        onSave(
                            name.trimmingCharacters(in: .whitespaces),
                            weight.isEmpty ? nil : weight,
                            colorway.trimmingCharacters(in: .whitespaces),
                            fiberContent.trimmingCharacters(in: .whitespaces),
                            strands
                        )
                        dismiss()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                    .fontWeight(.semibold)
                }
            }
            .confirmationDialog("Remove this yarn?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
                Button("Remove", role: .destructive) {
                    onDelete?()
                    dismiss()
                }
                Button("Cancel", role: .cancel) {}
            }
            .onAppear {
                guard let yarn = existingYarn else { return }
                name = yarn.name
                weight = yarn.weight ?? ""
                colorway = yarn.colorway ?? ""
                fiberContent = yarn.fiberContent ?? ""
                strands = yarn.strands
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Needle Editor Sheet

struct NeedleEditorSheet: View {
    @Environment(\.dismiss) private var dismiss
    let onSave: (PatternNeedleEntry) -> Void

    @State private var type = "straight"
    @State private var sizeMm = 4.0
    @State private var lengthText = ""
    @State private var material = ""
    @State private var brand = ""
    @State private var notes = ""

    private let types = [
        ("straight", "Straight"), ("circular", "Circular"),
        ("dpn", "DPN"), ("crochet_hook", "Crochet hook"),
        ("interchangeable_tip", "Interchangeable tip"),
    ]

    private let commonSizes: [Double] = [
        2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 3.8, 4.0, 4.5,
        5.0, 5.5, 6.0, 6.5, 7.0, 8.0, 9.0, 10.0, 12.0, 15.0,
    ]

    var body: some View {
        NavigationStack {
            Form {
                Section("Needle type") {
                    Picker("Type", selection: $type) {
                        ForEach(types, id: \.0) { value, label in
                            Text(label).tag(value)
                        }
                    }
                }

                Section("Size") {
                    Picker("Size (mm)", selection: $sizeMm) {
                        ForEach(commonSizes, id: \.self) { size in
                            Text("\(String(format: "%.2g", size))mm").tag(size)
                        }
                    }
                }

                Section("Details") {
                    HStack {
                        Text("Length (cm)")
                        Spacer()
                        TextField("Optional", text: $lengthText)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 80)
                    }
                    TextField("Material (e.g., bamboo, metal)", text: $material)
                    TextField("Brand", text: $brand)
                    TextField("Notes", text: $notes)
                }
            }
            .navigationTitle("Add needle")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        var entry = PatternNeedleEntry()
                        entry.type = type
                        entry.sizeMm = sizeMm
                        entry.lengthCm = Int(lengthText)
                        entry.material = material.isEmpty ? nil : material
                        entry.brand = brand.isEmpty ? nil : brand
                        entry.notes = notes.isEmpty ? nil : notes
                        onSave(entry)
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Supporting Views

private struct LabeledTextField: View {
    let label: String
    @Binding var text: String
    var placeholder: String = ""
    var keyboardType: UIKeyboardType = .default

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            TextField(placeholder, text: $text)
                .keyboardType(keyboardType)
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }
}

private struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
