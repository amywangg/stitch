import SwiftUI
import PhotosUI

@Observable
final class ProjectDetailViewModel {
    var project: Project?
    var isLoading = false
    var isSaving = false
    var error: String?

    private struct ProjectUpdate: Encodable {
        let title: String
        let status: String
        let craft_type: String
        let description: String?
        let size_made: String?
        let mods_notes: String?
        let started_at: String?
        let finished_at: String?
        let pdf_upload_id: String?
    }

    func load(projectId: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<Project> = try await APIClient.shared.get("/projects/\(projectId)")
            project = response.data
        } catch {
            self.error = String(describing: error)
        }
    }

    var sessions: [CraftingSession] = []

    func loadSessions(projectId: String) async {
        do {
            let response: APIResponse<PaginatedData<CraftingSession>> = try await APIClient.shared.get(
                "/sessions?project_id=\(projectId)&page_size=5"
            )
            sessions = response.data.items
        } catch {
            // Non-critical — don't show error
        }
    }

    var isDeleting = false
    var didDelete = false

    func deleteProject() async {
        guard let project else { return }
        isDeleting = true
        defer { isDeleting = false }
        struct Empty: Decodable {}
        do {
            let _: APIResponse<Empty> = try await APIClient.shared.delete("/projects/\(project.id)")
            didDelete = true
        } catch {
            self.error = error.localizedDescription
        }
    }

    private struct PdfAttachment: Encodable {
        let pdf_upload_id: String?
    }

    func attachPdf(_ pdfUploadId: String?) async {
        guard let project else { return }
        do {
            let _: APIResponse<Project> = try await APIClient.shared.patch(
                "/projects/\(project.id)",
                body: PdfAttachment(pdf_upload_id: pdfUploadId)
            )
            await load(projectId: project.id)
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Yarn CRUD

    func addYarnFromStash(stashItemId: String) async {
        guard let project else { return }
        do {
            let _ = try await APIClient.shared.post(
                "/projects/\(project.id)/yarns",
                body: ["stash_item_id": stashItemId]
            )
            await load(projectId: project.id)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func addYarnManual(name: String) async {
        guard let project else { return }
        do {
            let _ = try await APIClient.shared.post(
                "/projects/\(project.id)/yarns",
                body: ["name_override": name]
            )
            await load(projectId: project.id)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deleteYarn(_ yarnId: String) async {
        guard let project else { return }
        // Optimistic: remove from local state
        self.project?.yarns?.removeAll { $0.id == yarnId }
        do {
            struct Empty: Decodable {}
            let _: APIResponse<Empty> = try await APIClient.shared.delete(
                "/projects/\(project.id)/yarns/\(yarnId)"
            )
        } catch {
            self.error = error.localizedDescription
            await load(projectId: project.id)
        }
    }

    // MARK: - Needle CRUD

    func addNeedleFromCollection(needleId: String) async {
        guard let project else { return }
        do {
            let _ = try await APIClient.shared.post(
                "/projects/\(project.id)/needles",
                body: ["needle_id": needleId]
            )
            await load(projectId: project.id)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func addNeedleManual(type: String, sizeMm: Double, sizeLabel: String?, material: String?) async {
        guard let project else { return }
        do {
            var body: [String: Any] = ["type": type, "size_mm": sizeMm]
            if let sl = sizeLabel { body["size_label"] = sl }
            if let m = material { body["material"] = m }
            let _ = try await APIClient.shared.post(
                "/projects/\(project.id)/needles",
                body: body
            )
            await load(projectId: project.id)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deleteNeedle(_ needleId: String) async {
        guard let project else { return }
        // Optimistic: remove from local state
        self.project?.needles?.removeAll { $0.id == needleId }
        do {
            struct Empty: Decodable {}
            let _: APIResponse<Empty> = try await APIClient.shared.delete(
                "/projects/\(project.id)/needles/\(needleId)"
            )
        } catch {
            self.error = error.localizedDescription
            await load(projectId: project.id)
        }
    }

    func save() async {
        guard let project else { return }
        isSaving = true
        defer { isSaving = false }
        do {
            let fmt = ISO8601DateFormatter()
            let body = ProjectUpdate(
                title: project.title,
                status: project.status,
                craft_type: project.craftType,
                description: project.description,
                size_made: project.sizeMade,
                mods_notes: project.modsNotes,
                started_at: project.startedAt.map { fmt.string(from: $0) },
                finished_at: project.finishedAt.map { fmt.string(from: $0) },
                pdf_upload_id: project.pdfUploadId
            )
            let _: APIResponse<Project> = try await APIClient.shared.patch(
                "/projects/\(project.id)", body: body
            )
            // Reload full project with relations
            await load(projectId: project.id)
        } catch {
            self.error = error.localizedDescription
        }
    }

    var isUploadingPhoto = false

    func uploadPhoto(imageData: Data, projectId: String) async {
        isUploadingPhoto = true
        defer { isUploadingPhoto = false }
        do {
            let _: APIResponse<ProjectPhoto> = try await APIClient.shared.upload(
                "/projects/\(projectId)/photos",
                imageData: imageData,
                mimeType: "image/jpeg",
                fileName: "project_photo.jpg"
            )
            await load(projectId: projectId)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deletePhoto(_ photoId: String, projectId: String) async {
        // Optimistic remove
        project?.photos?.removeAll { $0.id == photoId }
        struct Body: Encodable { let photo_id: String }
        do {
            struct Empty: Decodable {}
            let _: APIResponse<Empty> = try await APIClient.shared.delete(
                "/projects/\(projectId)/photos",
                body: Body(photo_id: photoId)
            )
        } catch {
            self.error = error.localizedDescription
            await load(projectId: projectId)
        }
    }

    func addCounter(name: String, targetRows: Int?, projectId: String) async {
        struct Body: Encodable {
            let name: String
            let target_rows: Int?
        }
        do {
            let _: APIResponse<ProjectSection> = try await APIClient.shared.post(
                "/projects/\(projectId)/sections",
                body: Body(name: name, target_rows: targetRows)
            )
            await load(projectId: projectId)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func saveProgress(_ pct: Int, projectId: String) async {
        project?.progressPct = pct
        struct Body: Encodable { let progress_pct: Int }
        do {
            let _: APIResponse<Project> = try await APIClient.shared.patch(
                "/projects/\(projectId)", body: Body(progress_pct: pct)
            )
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deleteCounter(_ sectionId: String, projectId: String) async {
        project?.sections?.removeAll { $0.id == sectionId }
        do {
            struct Empty: Decodable {}
            let _: APIResponse<Empty> = try await APIClient.shared.delete(
                "/projects/\(projectId)/sections/\(sectionId)"
            )
        } catch {
            self.error = error.localizedDescription
            await load(projectId: projectId)
        }
    }
}

struct ProjectDetailView: View {
    let projectId: String
    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = ProjectDetailViewModel()
    @State private var isEditing = false
    @State private var showDeleteConfirmation = false
    @State private var showPdfPicker = false
    @State private var showPdfViewer = false
    @State private var showLogSession = false
    @State private var showYarnPicker = false
    @State private var showNeedlePicker = false
    @State private var yarnToDelete: ProjectYarn?
    @State private var needleToDelete: ProjectNeedle?
    @State private var showNoteEditor = false
    @State private var editingNoteField: NoteField = .description
    @State private var editingNoteText = ""
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var showPhotoPicker = false
    @State private var showProPaywall = false
    @State private var showAddCounter = false
    @State private var newCounterName = ""
    @State private var newCounterTarget: String = ""
    @Environment(AppRouter.self) private var router
    @Environment(SubscriptionManager.self) private var subscriptions
    @Environment(\.dismiss) private var dismiss

    private enum NoteField {
        case description, modsNotes
    }

    var body: some View {
        contentView
            .task {
                await viewModel.load(projectId: projectId)
            }
            .onAppear {
                // Refresh when returning from counter/edit/other views
                if viewModel.project != nil {
                    Task {
                        await viewModel.load(projectId: projectId)
                        await viewModel.loadSessions(projectId: projectId)
                    }
                }
            }
            .task {
                await viewModel.loadSessions(projectId: projectId)
            }
    }

    @ViewBuilder
    private var contentView: some View {
        if viewModel.isLoading && viewModel.project == nil {
            ProgressView("Loading...")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let project = viewModel.project {
            projectContent(project)
                .navigationTitle(project.title)
                .navigationBarTitleDisplayMode(.large)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Menu {
                            Button {
                                isEditing = true
                            } label: {
                                Label("Edit", systemImage: "pencil")
                            }

                            if project.status != "completed" {
                                Button {
                                    showLogSession = true
                                } label: {
                                    Label("Log session", systemImage: "clock.badge.checkmark")
                                }
                            }

                            if project.pdfUpload != nil {
                                Button {
                                    showPdfViewer = true
                                } label: {
                                    Label("View PDF", systemImage: "doc.text")
                                }
                                Button {
                                    Task { await viewModel.attachPdf(nil) }
                                } label: {
                                    Label("Detach PDF", systemImage: "doc.badge.ellipsis")
                                }
                            } else {
                                Button {
                                    showPdfPicker = true
                                } label: {
                                    Label("Attach PDF", systemImage: "doc.badge.plus")
                                }
                            }

                            Button {
                                showPhotoPicker = true
                            } label: {
                                Label("Add photo", systemImage: "camera")
                            }

                            Button(role: .destructive) {
                                showDeleteConfirmation = true
                            } label: {
                                Label("Delete project", systemImage: "trash")
                            }
                        } label: {
                            Image(systemName: "ellipsis.circle")
                        }
                    }
                }
                .sheet(isPresented: $isEditing) {
                    ProjectEditSheet(viewModel: viewModel, isPresented: $isEditing)
                }
                .alert(
                    "Delete project",
                    isPresented: $showDeleteConfirmation
                ) {
                    Button("Delete", role: .destructive) {
                        Task {
                            await viewModel.deleteProject()
                            if viewModel.didDelete {
                                dismiss()
                            }
                        }
                    }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text("Are you sure you want to delete \"\(project.title)\"? This cannot be undone.")
                }
                .sheet(isPresented: $showPdfPicker) {
                    PDFPickerView { pdf in
                        Task { await viewModel.attachPdf(pdf.id) }
                    }
                }
                .sheet(isPresented: $showPdfViewer) {
                    if let pdf = project.pdfUpload {
                        NavigationStack {
                            PDFViewerView(pdfUploadId: pdf.id, fileName: pdf.fileName ?? "Pattern PDF")
                                .toolbar {
                                    ToolbarItem(placement: .cancellationAction) {
                                        Button("Done") { showPdfViewer = false }
                                    }
                                }
                        }
                    }
                }
                .sheet(isPresented: $showLogSession) {
                    ManualSessionSheet(projectId: projectId) {
                        Task { await viewModel.loadSessions(projectId: projectId) }
                    }
                }
                .sheet(isPresented: $showNoteEditor) {
                    NoteEditorSheet(
                        title: editingNoteField == .description ? "Notes" : "Modifications",
                        text: $editingNoteText
                    ) {
                        switch editingNoteField {
                        case .description:
                            viewModel.project?.description = editingNoteText.isEmpty ? nil : editingNoteText
                        case .modsNotes:
                            viewModel.project?.modsNotes = editingNoteText.isEmpty ? nil : editingNoteText
                        }
                        Task {
                            await viewModel.save()
                        }
                    }
                }
                .sheet(isPresented: $showYarnPicker) {
                    StashPickerSheet { stashItemId in
                        Task { await viewModel.addYarnFromStash(stashItemId: stashItemId) }
                    }
                }
                .sheet(isPresented: $showNeedlePicker) {
                    NeedlePickerSheet { needleId in
                        Task { await viewModel.addNeedleFromCollection(needleId: needleId) }
                    }
                }
                .confirmationDialog(
                    "Remove yarn?",
                    isPresented: .init(
                        get: { yarnToDelete != nil },
                        set: { if !$0 { yarnToDelete = nil } }
                    ),
                    titleVisibility: .visible
                ) {
                    Button("Remove", role: .destructive) {
                        if let yarn = yarnToDelete {
                            yarnToDelete = nil
                            Task { await viewModel.deleteYarn(yarn.id) }
                        }
                    }
                    Button("Cancel", role: .cancel) { yarnToDelete = nil }
                }
                .confirmationDialog(
                    "Remove needle?",
                    isPresented: .init(
                        get: { needleToDelete != nil },
                        set: { if !$0 { needleToDelete = nil } }
                    ),
                    titleVisibility: .visible
                ) {
                    Button("Remove", role: .destructive) {
                        if let needle = needleToDelete {
                            needleToDelete = nil
                            Task { await viewModel.deleteNeedle(needle.id) }
                        }
                    }
                    Button("Cancel", role: .cancel) { needleToDelete = nil }
                }
                .alert("Add row counter", isPresented: $showAddCounter) {
                    TextField("Counter name", text: $newCounterName)
                    TextField("Target rows (optional)", text: $newCounterTarget)
                        .keyboardType(.numberPad)
                    Button("Cancel", role: .cancel) {
                        newCounterName = ""
                        newCounterTarget = ""
                    }
                    Button("Add") {
                        let name = newCounterName.trimmingCharacters(in: .whitespaces)
                        let target = Int(newCounterTarget)
                        newCounterName = ""
                        newCounterTarget = ""
                        guard !name.isEmpty else { return }
                        Task { await viewModel.addCounter(name: name, targetRows: target, projectId: projectId) }
                    }
                } message: {
                    Text("Add a simple row counter to this project.")
                }
                .photosPicker(isPresented: $showPhotoPicker, selection: $selectedPhotoItem, matching: .images)
                .onChange(of: selectedPhotoItem) { _, item in
                    guard let item else { return }
                    Task {
                        if let data = try? await item.loadTransferable(type: Data.self) {
                            await viewModel.uploadPhoto(imageData: data, projectId: projectId)
                        }
                        selectedPhotoItem = nil
                    }
                }
                .errorAlert(error: $viewModel.error)
        } else if let error = viewModel.error {
            ScrollView {
                VStack(spacing: 12) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.largeTitle)
                        .foregroundStyle(.orange)
                    Text("Failed to load project")
                        .font(.headline)
                    Text(error)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 60)
            }
        } else {
            Text("Loading...")
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Project Content

    private func projectContent(_ project: Project) -> some View {
        ScrollView {
            VStack(spacing: 0) {
                // Photo carousel — user photos first, pattern cover as fallback
                if let photos = project.photos, !photos.isEmpty {
                    ProjectPhotoCarousel(photos: photos)
                } else if let patternCover = project.pattern?.coverImageUrl, let url = URL(string: patternCover) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(maxWidth: .infinity)
                                .frame(height: 260)
                                .clipped()
                        default:
                            EmptyView()
                        }
                    }
                }

                VStack(spacing: 20) {
                    ProjectHeaderBadges(project: project)

                    // Linked pattern card
                    if let pattern = project.pattern {
                        ProjectPatternCard(pattern: pattern)
                    }

                    // Progress display — parsed projects get the master card, non-parsed get a slider
                    if let sections = project.sections, !sections.isEmpty {
                        let hasParsed = sections.contains { $0.patternSection?.rows?.isEmpty == false }
                        if hasParsed {
                            ProjectMasterProgressCard(sections: sections)
                        } else {
                            ProjectManualProgressSlider(
                                progressPct: viewModel.project?.progressPct ?? 0,
                                onChange: { pct in
                                    Task { await viewModel.saveProgress(pct, projectId: projectId) }
                                }
                            )
                        }
                    } else {
                        ProjectManualProgressSlider(
                            progressPct: viewModel.project?.progressPct ?? 0,
                            onChange: { pct in
                                Task { await viewModel.saveProgress(pct, projectId: projectId) }
                            }
                        )
                    }

                    if project.startedAt != nil || project.finishedAt != nil || project.sizeMade != nil {
                        ProjectQuickStats(project: project)
                    }

                    ProjectEditableNotesBlock(
                        title: "Notes",
                        text: viewModel.project?.description,
                        onEdit: {
                            editingNoteField = .description
                            editingNoteText = viewModel.project?.description ?? ""
                            showNoteEditor = true
                        }
                    )

                    ProjectEditableNotesBlock(
                        title: "Modifications",
                        text: viewModel.project?.modsNotes,
                        onEdit: {
                            editingNoteField = .modsNotes
                            editingNoteText = viewModel.project?.modsNotes ?? ""
                            showNoteEditor = true
                        }
                    )

                    if let tags = project.tags, !tags.isEmpty {
                        ProjectTagsBlock(tags: tags)
                    }

                    if let pdf = project.pdfUpload {
                        ProjectPdfBlock(pdf: pdf, onTap: { showPdfViewer = true })
                    } else if project.status != "completed" {
                        pdfAttachCallout
                    }

                    if let gauge = project.gauge,
                       (gauge.stitchesPer10cm != nil || gauge.rowsPer10cm != nil) {
                        ProjectGaugeBlock(gauge: gauge)
                    }

                    ProjectYarnsBlock(
                        yarns: project.yarns ?? [],
                        onAdd: { showYarnPicker = true },
                        onDelete: { yarn in yarnToDelete = yarn }
                    )

                    ProjectNeedlesBlock(
                        needles: project.needles ?? [],
                        onAdd: { showNeedlePicker = true },
                        onDelete: { needle in needleToDelete = needle }
                    )

                    if let sections = project.sections, !sections.isEmpty {
                        let parsedSections = sections.filter { $0.patternSection?.rows?.isEmpty == false }
                        let counterSections = sections.filter { $0.patternSection?.rows?.isEmpty != false }

                        // Parsed sections (from AI parse)
                        if !parsedSections.isEmpty {
                            ProjectSectionsBlock(
                                sections: parsedSections,
                                projectId: viewModel.project?.id,
                                pdfUploadId: viewModel.project?.pdfUploadId
                            )
                        }

                        // Row counters — always shown for both parsed and non-parsed
                        ProjectRowCountersBlock(
                            counters: counterSections,
                            allSections: sections,
                            projectId: projectId,
                            pdfUploadId: viewModel.project?.pdfUploadId,
                            onAdd: { showAddCounter = true },
                            onDelete: { sectionId in
                                Task { await viewModel.deleteCounter(sectionId, projectId: projectId) }
                            }
                        )

                        // AI parse prompt — shown when PDF exists but no parsed sections
                        if project.pdfUpload != nil, parsedSections.isEmpty {
                            aiParsePrompt
                        }
                    } else {
                        // No sections at all — show empty counter block with add
                        ProjectRowCountersBlock(
                            counters: [],
                            allSections: [],
                            projectId: projectId,
                            pdfUploadId: viewModel.project?.pdfUploadId,
                            onAdd: { showAddCounter = true },
                            onDelete: { _ in }
                        )

                        if project.pdfUpload != nil {
                            aiParsePrompt
                        }
                    }

                    if !viewModel.sessions.isEmpty {
                        ProjectSessionsBlock(
                            sessions: viewModel.sessions,
                            isCompleted: project.status == "completed",
                            onLogSession: { showLogSession = true }
                        )
                    }

                    // Spacer for continue button
                    if let sections = project.sections, sections.contains(where: { $0.completed != true }) {
                        Color.clear.frame(height: 60)
                    }
                }
                .padding()
            }
        }
        .overlay(alignment: .bottom) {
            if let sections = project.sections, sections.contains(where: { $0.completed != true }) {
                ProjectContinueKnittingButton(project: project, sections: sections)
            }
        }
    }

    // MARK: - PDF Attach Callout

    private var pdfAttachCallout: some View {
        Button {
            showPdfPicker = true
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "doc.badge.plus")
                    .font(.title3)
                    .foregroundStyle(theme.primary)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Attach pattern PDF")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.primary)
                    Text("Unlock row-by-row tracking and AI parsing")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer(minLength: 0)

                Text("Add")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(theme.primary, in: Capsule())
            }
            .padding(14)
            .background(theme.primary.opacity(0.06), in: RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .strokeBorder(theme.primary.opacity(0.2), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - AI Parse Prompt

    private var aiParsePrompt: some View {
        Button {
            if subscriptions.isPro {
                // TODO: trigger AI parse of this project's PDF
                viewModel.error = "AI parsing coming soon"
            } else {
                showProPaywall = true
            }
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "sparkles")
                    .font(.title3)
                    .foregroundStyle(theme.primary)

                VStack(alignment: .leading, spacing: 2) {
                    Text("AI parse pattern")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.primary)
                    Text("Get step-by-step row instructions from your PDF")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer(minLength: 0)

                if !subscriptions.isPro {
                    Text("Pro")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(theme.primary, in: Capsule())
                } else {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
            .padding(14)
            .background(theme.primary.opacity(0.06), in: RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .strokeBorder(theme.primary.opacity(0.2), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $showProPaywall) {
            StitchPaywallView()
        }
    }
}

// MARK: - Note Editor Sheet

private struct NoteEditorSheet: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss
    let title: String
    @Binding var text: String
    let onSave: () -> Void

    var body: some View {
        NavigationStack {
            TextEditor(text: $text)
                .padding()
                .navigationTitle(title)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { dismiss() }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Save") {
                            onSave()
                            dismiss()
                        }
                        .fontWeight(.semibold)
                    }
                }
        }
    }
}

// MARK: - Edit Sheet

struct ProjectEditSheet: View {
    @Environment(ThemeManager.self) private var theme
    @Bindable var viewModel: ProjectDetailViewModel
    @Binding var isPresented: Bool

    private let statuses = ["active", "completed", "hibernating", "frogged"]
    private let craftTypes = ["knitting", "crochet"]

    var body: some View {
        NavigationStack {
            Form {
                Section("Details") {
                    TextField("Title", text: Binding(
                        get: { viewModel.project?.title ?? "" },
                        set: { viewModel.project?.title = $0 }
                    ))

                    Picker("Status", selection: Binding(
                        get: { viewModel.project?.status ?? "active" },
                        set: { viewModel.project?.status = $0 }
                    )) {
                        ForEach(statuses, id: \.self) { Text($0.capitalized).tag($0) }
                    }

                    Picker("Craft", selection: Binding(
                        get: { viewModel.project?.craftType ?? "knitting" },
                        set: { viewModel.project?.craftType = $0 }
                    )) {
                        ForEach(craftTypes, id: \.self) { Text($0.capitalized).tag($0) }
                    }

                    TextField("Size Made", text: Binding(
                        get: { viewModel.project?.sizeMade ?? "" },
                        set: { viewModel.project?.sizeMade = $0.isEmpty ? nil : $0 }
                    ))
                }

                Section("Dates") {
                    OptionalDatePicker(label: "Started", date: Binding(
                        get: { viewModel.project?.startedAt },
                        set: { viewModel.project?.startedAt = $0 }
                    ))

                    OptionalDatePicker(label: "Finished", date: Binding(
                        get: { viewModel.project?.finishedAt },
                        set: { viewModel.project?.finishedAt = $0 }
                    ))
                }

                Section("Notes") {
                    TextEditor(text: Binding(
                        get: { viewModel.project?.description ?? "" },
                        set: { viewModel.project?.description = $0.isEmpty ? nil : $0 }
                    ))
                    .frame(minHeight: 80)
                }

                Section("Modifications") {
                    TextEditor(text: Binding(
                        get: { viewModel.project?.modsNotes ?? "" },
                        set: { viewModel.project?.modsNotes = $0.isEmpty ? nil : $0 }
                    ))
                    .frame(minHeight: 80)
                }
            }
            .navigationTitle("Edit Project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        Task {
                            if let id = viewModel.project?.id {
                                await viewModel.load(projectId: id)
                            }
                            isPresented = false
                        }
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task {
                            await viewModel.save()
                            isPresented = false
                        }
                    }
                    .disabled(viewModel.isSaving)
                }
            }
        }
    }
}

private struct OptionalDatePicker: View {
    let label: String
    @Binding var date: Date?
    @State private var isEnabled: Bool

    init(label: String, date: Binding<Date?>) {
        self.label = label
        self._date = date
        self._isEnabled = State(initialValue: date.wrappedValue != nil)
    }

    var body: some View {
        HStack {
            Toggle(label, isOn: $isEnabled)
                .onChange(of: isEnabled) { _, newValue in
                    date = newValue ? (date ?? Date()) : nil
                }
            if isEnabled {
                DatePicker("", selection: Binding(
                    get: { date ?? Date() },
                    set: { date = $0 }
                ), displayedComponents: .date)
                .labelsHidden()
            }
        }
    }
}
