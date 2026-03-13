import SwiftUI

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

    var isDeleting = false
    var didDelete = false

    func deleteProject() async {
        guard let project else { return }
        isDeleting = true
        defer { isDeleting = false }
        struct Empty: Decodable {}
        do {
            let _: Empty = try await APIClient.shared.delete("/projects/\(project.id)")
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
}

struct ProjectDetailView: View {
    let projectId: String
    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = ProjectDetailViewModel()
    @State private var isEditing = false
    @State private var showDeleteConfirmation = false
    @State private var showPdfPicker = false
    @State private var showPdfViewer = false
    @Environment(AppRouter.self) private var router
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        contentView
            .task {
                if viewModel.project == nil {
                    await viewModel.load(projectId: projectId)
                }
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

                            if project.pdfUpload != nil {
                                Button {
                                    showPdfViewer = true
                                } label: {
                                    Label("View PDF", systemImage: "doc.text")
                                }
                                Button {
                                    Task { await viewModel.attachPdf(nil) }
                                } label: {
                                    Label("Detach PDF", systemImage: "doc.badge.minus")
                                }
                            } else {
                                Button {
                                    showPdfPicker = true
                                } label: {
                                    Label("Attach PDF", systemImage: "doc.badge.plus")
                                }
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
                            PDFViewerView(pdfUploadId: pdf.id, fileName: pdf.fileName)
                                .toolbar {
                                    ToolbarItem(placement: .cancellationAction) {
                                        Button("Done") { showPdfViewer = false }
                                    }
                                }
                        }
                    }
                }
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

    private func projectContent(_ project: Project) -> some View {
        ScrollView {
            VStack(spacing: 0) {
                // Photo carousel
                if let photos = project.photos, !photos.isEmpty {
                    photoCarousel(photos)
                }

                VStack(spacing: 20) {
                    headerBadges(project)

                    // Master progress card
                    if let sections = project.sections, !sections.isEmpty {
                        masterProgressCard(sections)
                    }

                    if project.startedAt != nil || project.finishedAt != nil || project.sizeMade != nil {
                        quickStats(project)
                    }

                    if let desc = project.description, !desc.isEmpty {
                        notesBlock("Notes", desc)
                    }

                    if let mods = project.modsNotes, !mods.isEmpty {
                        notesBlock("Modifications", mods)
                    }

                    if let pdf = project.pdfUpload {
                        pdfBlock(pdf)
                    }

                    if let gauge = project.gauge,
                       (gauge.stitchesPer10cm != nil || gauge.rowsPer10cm != nil) {
                        gaugeBlock(gauge)
                    }

                    if let yarns = project.yarns, !yarns.isEmpty {
                        yarnsBlock(yarns)
                    }

                    if let sections = project.sections, !sections.isEmpty {
                        sectionsBlock(sections)
                    }

                    if let permalink = project.ravelryPermalink {
                        ravelryLink(permalink)
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
                continueKnittingButton(project: project, sections: sections)
            }
        }
    }

    // MARK: - Photo Carousel

    private func photoCarousel(_ photos: [ProjectPhoto]) -> some View {
        TabView {
            ForEach(photos) { photo in
                AsyncImage(url: URL(string: photo.url)) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    case .failure:
                        Color(.systemGray5)
                            .overlay { Image(systemName: "photo").font(.largeTitle).foregroundStyle(.secondary) }
                    default:
                        Color(.systemGray6).overlay { ProgressView() }
                    }
                }
                .frame(height: 300)
                .clipped()
            }
        }
        .tabViewStyle(.page(indexDisplayMode: photos.count > 1 ? .always : .never))
        .frame(height: 300)
    }

    // MARK: - Header Badges

    private func headerBadges(_ project: Project) -> some View {
        HStack(spacing: 8) {
            badge(project.status.capitalized, icon: statusIcon(project.status), color: statusColor(project.status))
            badge(project.craftType.capitalized, icon: "leaf", color: .secondary)
            if project.ravelryId != nil {
                badge("Ravelry", icon: "link", color: theme.primary)
            }
            Spacer()
        }
    }

    private func badge(_ text: String, icon: String, color: Color) -> some View {
        Label(text, systemImage: icon)
            .font(.caption.weight(.medium))
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(color.opacity(0.12), in: Capsule())
    }

    private func statusIcon(_ status: String) -> String {
        switch status {
        case "completed": return "checkmark.circle.fill"
        case "hibernating": return "moon.fill"
        case "frogged": return "scissors"
        default: return "play.circle.fill"
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "completed": return .green
        case "hibernating": return .orange
        case "frogged": return .red
        default: return theme.primary
        }
    }

    // MARK: - Quick Stats

    private func quickStats(_ project: Project) -> some View {
        HStack(spacing: 0) {
            if let started = project.startedAt {
                statCell("Started", started.formatted(date: .abbreviated, time: .omitted))
            }
            if let finished = project.finishedAt {
                statCell("Finished", finished.formatted(date: .abbreviated, time: .omitted))
            }
            if let size = project.sizeMade {
                statCell("Size", size)
            }
        }
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func statCell(_ label: String, _ value: String) -> some View {
        VStack(spacing: 4) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            Text(value).font(.subheadline.weight(.medium))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
    }

    // MARK: - Notes

    private func notesBlock(_ title: String, _ text: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.headline)
            Text(text).font(.body).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Gauge

    private func gaugeBlock(_ gauge: ProjectGauge) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Gauge").font(.headline)
            HStack(spacing: 12) {
                if let sts = gauge.stitchesPer10cm {
                    gaugeCard(String(format: "%.1f", sts), "sts/10cm")
                }
                if let rows = gauge.rowsPer10cm {
                    gaugeCard(String(format: "%.1f", rows), "rows/10cm")
                }
                if let needle = gauge.needleSizeMm {
                    gaugeCard(String(format: "%.1fmm", needle), "needle")
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func gaugeCard(_ value: String, _ label: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.title3.weight(.semibold))
            Text(label).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    // MARK: - Yarns

    private func yarnsBlock(_ yarns: [ProjectYarn]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Yarns").font(.headline)
            ForEach(yarns) { yarn in
                HStack(spacing: 12) {
                    Circle()
                        .fill(theme.primary.opacity(0.2))
                        .frame(width: 40, height: 40)
                        .overlay {
                            Image(systemName: "wand.and.rays.inverse")
                                .foregroundStyle(theme.primary)
                        }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(yarnDisplayName(yarn))
                            .font(.subheadline.weight(.medium))
                        HStack(spacing: 8) {
                            if let cw = yarn.colorway { Text(cw).font(.caption).foregroundStyle(.secondary) }
                            if let sk = yarn.skeinsUsed, sk > 0 {
                                Text("\(String(format: "%.1f", sk)) skeins").font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                    Spacer()
                }
                .padding(12)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func yarnDisplayName(_ yarn: ProjectYarn) -> String {
        if let d = yarn.yarn {
            if let c = d.company { return "\(c.name) \(d.name)" }
            return d.name
        }
        return yarn.nameOverride ?? "Unknown Yarn"
    }

    // MARK: - Master Progress

    private func masterProgressCard(_ sections: [ProjectSection]) -> some View {
        let completedCount = sections.filter { $0.completed == true }.count
        let totalPct = masterProgressPct(sections)
        let activeSection = sections.first { $0.completed != true }

        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("\(Int(totalPct * 100))%")
                    .font(.title2.weight(.bold))
                    .foregroundStyle(theme.primary)
                Spacer()
                Text("\(completedCount) of \(sections.count) sections complete")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            // Segmented progress bar
            GeometryReader { proxy in
                HStack(spacing: 2) {
                    ForEach(sections) { section in
                        let weight = sectionWeight(section, totalSections: sections)
                        let sectionPct = sectionCompletionPct(section)
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(Color(.systemGray5))
                            RoundedRectangle(cornerRadius: 2)
                                .fill(section.completed == true ? theme.primary : theme.primary.opacity(0.6))
                                .frame(width: (proxy.size.width * weight - 2) * sectionPct)
                        }
                        .frame(width: proxy.size.width * weight - 2)
                    }
                }
            }
            .frame(height: 6)

            if let active = activeSection {
                Text("Active: \(active.name)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func masterProgressPct(_ sections: [ProjectSection]) -> Double {
        let totalTarget = sections.reduce(0) { $0 + ($1.targetRows ?? 1) }
        guard totalTarget > 0 else { return 0 }
        let totalDone = sections.reduce(0) { sum, s in
            let target = s.targetRows ?? 1
            return sum + min(s.currentRow, target)
        }
        return Double(totalDone) / Double(totalTarget)
    }

    private func sectionWeight(_ section: ProjectSection, totalSections: [ProjectSection]) -> Double {
        let totalTarget = totalSections.reduce(0) { $0 + ($1.targetRows ?? 1) }
        guard totalTarget > 0 else { return 1.0 / Double(totalSections.count) }
        return Double(section.targetRows ?? 1) / Double(totalTarget)
    }

    private func sectionCompletionPct(_ section: ProjectSection) -> Double {
        if section.completed == true { return 1.0 }
        let target = section.targetRows ?? 1
        guard target > 0 else { return 0 }
        return min(Double(section.currentRow) / Double(target), 1.0)
    }

    // MARK: - Sections

    private func sectionRefs(_ sections: [ProjectSection]) -> [SectionRef] {
        sections.map { SectionRef(id: $0.id, name: $0.name) }
    }

    private func sectionsBlock(_ sections: [ProjectSection]) -> some View {
        let refs = sectionRefs(sections)
        let activeId = sections.first(where: { $0.completed != true })?.id

        return VStack(alignment: .leading, spacing: 8) {
            Text("Sections").font(.headline)
            ForEach(sections) { section in
                let isActive = section.id == activeId
                Button {
                    router.push(.counter(
                        sectionId: section.id,
                        allSections: refs,
                        projectId: viewModel.project?.id,
                        pdfUploadId: viewModel.project?.pdfUploadId
                    ))
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(section.name)
                                .font(.subheadline.weight(.medium))
                            Text("Row \(section.currentRow)\(section.targetRows.map { " of \($0)" } ?? "")")
                                .font(.caption).foregroundStyle(.secondary)
                            if let step = section.currentStep, let ps = section.patternSection,
                               let rows = ps.rows, !rows.isEmpty {
                                Text("Step \(step) of \(rows.count)")
                                    .font(.caption2).foregroundStyle(.tertiary)
                            }
                        }
                        Spacer()
                        if let target = section.targetRows, target > 0 {
                            let pct = min(Double(section.currentRow) / Double(target), 1.0)
                            ZStack {
                                Circle().stroke(Color(.systemGray4), lineWidth: 3)
                                Circle().trim(from: 0, to: pct)
                                    .stroke(theme.primary, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                                    .rotationEffect(.degrees(-90))
                                if section.completed == true {
                                    Image(systemName: "checkmark")
                                        .font(.caption2.bold())
                                        .foregroundStyle(theme.primary)
                                }
                            }
                            .frame(width: 28, height: 28)
                        } else if section.completed == true {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(theme.primary)
                        }
                        Image(systemName: "chevron.right").font(.caption).foregroundStyle(.tertiary)
                    }
                    .padding(12)
                    .background(
                        isActive
                            ? theme.primary.opacity(0.08)
                            : Color(.secondarySystemGroupedBackground)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .overlay(
                        isActive
                            ? RoundedRectangle(cornerRadius: 10).stroke(theme.primary.opacity(0.3), lineWidth: 1)
                            : nil
                    )
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Continue Knitting

    private func continueKnittingButton(project: Project, sections: [ProjectSection]) -> some View {
        let activeSection = sections.first { $0.completed != true }
        let refs = sectionRefs(sections)

        return Group {
            if let active = activeSection {
                Button {
                    router.push(.counter(
                        sectionId: active.id,
                        allSections: refs,
                        projectId: project.id,
                        pdfUploadId: project.pdfUploadId
                    ))
                } label: {
                    Text("Continue knitting")
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(theme.primary)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                }
                .padding(.horizontal)
                .padding(.bottom, 8)
                .background(
                    LinearGradient(
                        colors: [Color(.systemBackground).opacity(0), Color(.systemBackground)],
                        startPoint: .top,
                        endPoint: .center
                    )
                )
            }
        }
    }

    // MARK: - PDF Block

    private func pdfBlock(_ pdf: PdfUpload) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Pattern PDF").font(.headline)
            Button {
                showPdfViewer = true
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: "doc.fill")
                        .foregroundStyle(theme.primary)
                        .font(.title3)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(pdf.fileName)
                            .font(.subheadline.weight(.medium))
                            .lineLimit(2)
                        Text(ByteCountFormatter.string(fromByteCount: Int64(pdf.fileSize), countStyle: .file))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
                .padding(12)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            .buttonStyle(.plain)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Ravelry Link

    private func ravelryLink(_ permalink: String) -> some View {
        Group {
            if let url = URL(string: "https://www.ravelry.com/projects/\(permalink)") {
                Link(destination: url) {
                    HStack {
                        Image(systemName: "globe")
                        Text("View on Ravelry")
                        Spacer()
                        Image(systemName: "arrow.up.right").font(.caption)
                    }
                    .foregroundStyle(theme.primary)
                    .padding(12)
                    .background(theme.primary.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
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
