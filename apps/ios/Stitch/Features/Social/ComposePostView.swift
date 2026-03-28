import PhotosUI
import SwiftUI

// MARK: - ViewModel

@Observable
final class ComposePostViewModel {
    var content = ""
    var selectedPhotos: [PhotosPickerItem] = []
    var photoImages: [UIImage] = []
    var isPosting = false
    var error: String?
    var didPost = false

    // Context tags
    var linkedProject: LinkedProject?
    var linkedPattern: LinkedPattern?
    var taggedYarns: [TaggedYarn] = []
    var taggedNeedles: [TaggedNeedle] = []
    var sessionMinutes: Int?
    var sessionRows: Int?

    // Suggestions from projects
    var recentProjects: [LinkedProject] = []
    var isSuggestionsLoaded = false

    struct LinkedProject: Identifiable {
        let id: String
        let title: String
        let coverUrl: String?
        let patternTitle: String?
        let patternId: String?
        let yarns: [TaggedYarn]
        let needles: [TaggedNeedle]
    }

    struct LinkedPattern: Identifiable {
        let id: String
        let title: String
        let coverImageUrl: String?
    }

    struct TaggedYarn: Identifiable {
        let id = UUID().uuidString
        var name: String
        var colorway: String?
        var weight: String?
    }

    struct TaggedNeedle: Identifiable {
        let id = UUID().uuidString
        var label: String // e.g. "4.5mm Circular, 80cm"
    }

    var canPost: Bool {
        !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isPosting
    }

    var isOverLimit: Bool { content.count > 2000 }
    var charRemaining: Int { 2000 - content.count }

    func loadSuggestions() async {
        guard !isSuggestionsLoaded else { return }
        isSuggestionsLoaded = true
        do {
            let response: APIResponse<GroupedProjects> = try await APIClient.shared.get("/projects/grouped")
            recentProjects = response.data.inProgress.prefix(5).map { project in
                LinkedProject(
                    id: project.id,
                    title: project.title,
                    coverUrl: project.coverImageUrl,
                    patternTitle: project.pattern?.title,
                    patternId: project.pattern?.id,
                    yarns: (project.yarns ?? []).map { y in
                        TaggedYarn(name: y.displayName, colorway: y.colorway, weight: y.yarn?.weight)
                    },
                    needles: (project.needles ?? []).map { n in
                        TaggedNeedle(label: n.displayLabel)
                    }
                )
            }
        } catch {
            // Non-critical
        }
    }

    func attachProject(_ project: LinkedProject) {
        linkedProject = project
        // Auto-populate pattern, yarns, needles from project
        if let patternId = project.patternId, let patternTitle = project.patternTitle {
            linkedPattern = LinkedPattern(id: patternId, title: patternTitle, coverImageUrl: project.coverUrl)
        }
        taggedYarns = project.yarns
        taggedNeedles = project.needles
    }

    func detachProject() {
        linkedProject = nil
        linkedPattern = nil
        taggedYarns = []
        taggedNeedles = []
    }

    func loadPhotos() async {
        var images: [UIImage] = []
        for item in selectedPhotos {
            guard let data = try? await item.loadTransferable(type: Data.self),
                  let image = UIImage(data: data) else { continue }
            images.append(image)
        }
        photoImages = images
    }

    func removePhoto(at index: Int) {
        guard index < photoImages.count else { return }
        photoImages.remove(at: index)
        if index < selectedPhotos.count {
            selectedPhotos.remove(at: index)
        }
    }

    func post() async {
        let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        isPosting = true
        defer { isPosting = false }

        do {
            var photoUrls: [String] = []
            for image in photoImages {
                guard let jpegData = image.jpegData(compressionQuality: 0.8) else { continue }
                let response: APIResponse<PhotoUploadResult> = try await APIClient.shared.upload(
                    "/social/posts/photo",
                    imageData: jpegData,
                    mimeType: "image/jpeg",
                    fileName: "post_photo.jpg"
                )
                photoUrls.append(response.data.url)
            }

            var body: [String: Any] = ["content": trimmed]
            if !photoUrls.isEmpty { body["photo_urls"] = photoUrls }
            if let project = linkedProject { body["project_id"] = project.id }
            if let pattern = linkedPattern { body["pattern_id"] = pattern.id }
            if let mins = sessionMinutes, mins > 0 { body["session_minutes"] = mins }
            if let rows = sessionRows, rows > 0 { body["session_rows"] = rows }
            if !taggedYarns.isEmpty {
                body["yarns"] = taggedYarns.map { y in
                    var d: [String: Any] = ["yarn_name": y.name]
                    if let c = y.colorway { d["colorway"] = c }
                    if let w = y.weight { d["weight"] = w }
                    return d
                }
            }

            let _ = try await APIClient.shared.post("/social/posts", body: body)
            didPost = true
        } catch let apiError as APIError {
            self.error = apiError.errorDescription
        } catch {
            self.error = error.localizedDescription
        }
    }
}

private struct PhotoUploadResult: Decodable {
    let url: String
    let path: String
}

// MARK: - Compose Post View

struct ComposePostView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = ComposePostViewModel()
    @State private var showStashPicker = false
    @State private var showSessionLog = false
    @State private var showProjectPicker = false
    @State private var showNeedlePicker = false
    @FocusState private var isTextFocused: Bool
    let onPosted: () -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Photos section
                    photoSection
                        .padding(.horizontal, 16)
                        .padding(.top, 12)

                    // Text input
                    TextField(
                        "What are you working on?",
                        text: $viewModel.content,
                        axis: .vertical
                    )
                    .lineLimit(4...20)
                    .font(.body)
                    .focused($isTextFocused)
                    .padding(.horizontal, 16)
                    .padding(.top, 16)

                    // Character count near limit
                    if viewModel.content.count > 1800 {
                        HStack {
                            Spacer()
                            Text("\(viewModel.charRemaining)")
                                .font(.caption2.weight(.medium).monospacedDigit())
                                .foregroundStyle(viewModel.isOverLimit ? .red : .secondary)
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 4)
                    }

                    // Attached context
                    if hasContext {
                        attachedContext
                            .padding(.top, 16)
                    }

                    // Suggested projects
                    if viewModel.linkedProject == nil && !viewModel.recentProjects.isEmpty {
                        suggestedProjects
                            .padding(.top, 20)
                    }

                    // Add context actions
                    addContextSection
                        .padding(.top, 20)
                        .padding(.bottom, 120)
                }
            }
            .safeAreaInset(edge: .bottom) {
                bottomBar
            }
            .navigationTitle("Create post")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.body.weight(.medium))
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .overlay {
                if viewModel.isPosting {
                    Color.black.opacity(0.3).ignoresSafeArea()
                    VStack(spacing: 12) {
                        ProgressView().tint(.white).scaleEffect(1.2)
                        Text("Posting...")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.white)
                    }
                    .padding(28)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20))
                }
            }
        }
        .onChange(of: viewModel.selectedPhotos) { _, _ in
            Task { await viewModel.loadPhotos() }
        }
        .sheet(isPresented: $showSessionLog) {
            SessionLogSheet(minutes: $viewModel.sessionMinutes, rows: $viewModel.sessionRows)
        }
        .sheet(isPresented: $showProjectPicker) {
            PostProjectPickerSheet { project in
                viewModel.attachProject(project)
            }
        }
        .sheet(isPresented: $showStashPicker) {
            StashPickerSheet { stashItemId in
                Task { await addYarnFromStash(stashItemId: stashItemId) }
            }
        }
        .sheet(isPresented: $showNeedlePicker) {
            PostNeedlePickerSheet { label in
                viewModel.taggedNeedles.append(.init(label: label))
            }
        }
        .errorAlert(error: $viewModel.error)
        .task { await viewModel.loadSuggestions() }
        .onAppear { isTextFocused = true }
    }

    private var hasContext: Bool {
        viewModel.linkedProject != nil ||
        viewModel.linkedPattern != nil ||
        !viewModel.taggedYarns.isEmpty ||
        !viewModel.taggedNeedles.isEmpty ||
        viewModel.sessionMinutes != nil
    }

    // MARK: - Photos (Instagram carousel style)

    @ViewBuilder
    private var photoSection: some View {
        if viewModel.photoImages.isEmpty {
            // Empty — show add button
            PhotosPicker(
                selection: $viewModel.selectedPhotos,
                maxSelectionCount: 4,
                matching: .images
            ) {
                HStack(spacing: 10) {
                    Image(systemName: "photo.on.rectangle.angled")
                        .font(.title3)
                    Text("Add photos")
                        .font(.subheadline.weight(.medium))
                }
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity)
                .frame(height: 120)
                .background(
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(style: StrokeStyle(lineWidth: 1.5, dash: [8, 5]))
                        .foregroundStyle(Color(.systemGray4))
                )
            }
        } else {
            // Carousel
            VStack(spacing: 8) {
                TabView {
                    ForEach(viewModel.photoImages.indices, id: \.self) { index in
                        ZStack(alignment: .topTrailing) {
                            Image(uiImage: viewModel.photoImages[index])
                                .resizable()
                                .scaledToFill()
                                .frame(maxWidth: .infinity)
                                .frame(height: 260)
                                .clipShape(RoundedRectangle(cornerRadius: 14))

                            Button {
                                withAnimation { viewModel.removePhoto(at: index) }
                            } label: {
                                Image(systemName: "trash.fill")
                                    .font(.caption)
                                    .foregroundStyle(.white)
                                    .padding(8)
                                    .background(.black.opacity(0.5), in: Circle())
                            }
                            .padding(10)
                        }
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: viewModel.photoImages.count > 1 ? .always : .never))
                .frame(height: 260)

                // Add more button
                if viewModel.photoImages.count < 4 {
                    PhotosPicker(
                        selection: $viewModel.selectedPhotos,
                        maxSelectionCount: 4,
                        matching: .images
                    ) {
                        HStack(spacing: 6) {
                            Image(systemName: "plus.circle")
                                .font(.caption)
                            Text("Add more (\(4 - viewModel.photoImages.count) left)")
                                .font(.caption.weight(.medium))
                        }
                        .foregroundStyle(theme.primary)
                    }
                }
            }
        }
    }

    // MARK: - Attached Context

    private var attachedContext: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let project = viewModel.linkedProject {
                contextCard(
                    icon: "folder.fill", iconColor: theme.primary,
                    title: project.title, subtitle: "Project"
                ) { viewModel.detachProject() }
            }

            if let pattern = viewModel.linkedPattern, viewModel.linkedProject == nil {
                contextCard(
                    icon: "book.closed.fill", iconColor: Color(hex: "#4ECDC4"),
                    title: pattern.title, subtitle: "Pattern"
                ) { viewModel.linkedPattern = nil }
            }

            ForEach(Array(viewModel.taggedYarns.enumerated()), id: \.element.id) { index, yarn in
                contextCard(
                    icon: "tag.fill", iconColor: .orange,
                    title: yarn.name,
                    subtitle: [yarn.colorway, yarn.weight].compactMap { $0 }.joined(separator: " · ")
                ) { viewModel.taggedYarns.remove(at: index) }
            }

            ForEach(Array(viewModel.taggedNeedles.enumerated()), id: \.element.id) { index, needle in
                contextCard(
                    icon: "pencil.and.outline", iconColor: Color(hex: "#4ECDC4"),
                    title: needle.label, subtitle: "Needle"
                ) { viewModel.taggedNeedles.remove(at: index) }
            }

            if let mins = viewModel.sessionMinutes, mins > 0 {
                let hours = mins / 60
                let rem = mins % 60
                let timeStr = hours > 0 ? (rem > 0 ? "\(hours)h \(rem)m" : "\(hours)h") : "\(rem)m"
                let rowsStr = viewModel.sessionRows.map { " · \($0) rows" } ?? ""
                contextCard(
                    icon: "clock.fill", iconColor: .purple,
                    title: "\(timeStr)\(rowsStr)", subtitle: "Session"
                ) { viewModel.sessionMinutes = nil; viewModel.sessionRows = nil }
            }
        }
        .padding(.horizontal, 16)
    }

    private func contextCard(
        icon: String, iconColor: Color,
        title: String, subtitle: String,
        onRemove: @escaping () -> Void
    ) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.subheadline)
                .foregroundStyle(iconColor)
                .frame(width: 32, height: 32)
                .background(iconColor.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 1) {
                Text(title).font(.subheadline.weight(.medium)).lineLimit(1)
                if !subtitle.isEmpty {
                    Text(subtitle).font(.caption).foregroundStyle(.secondary)
                }
            }

            Spacer()

            Button { withAnimation { onRemove() } } label: {
                Image(systemName: "xmark")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.tertiary)
                    .padding(6)
            }
            .buttonStyle(.plain)
        }
        .padding(10)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Suggested Projects

    private var suggestedProjects: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("WORKING ON")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.secondary)
                .padding(.horizontal, 16)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(viewModel.recentProjects) { project in
                        Button { viewModel.attachProject(project) } label: {
                            HStack(spacing: 8) {
                                if let coverUrl = project.coverUrl, let url = URL(string: coverUrl) {
                                    AsyncImage(url: url) { image in
                                        image.resizable().scaledToFill()
                                    } placeholder: {
                                        Color(.systemGray5)
                                    }
                                    .frame(width: 32, height: 32)
                                    .clipShape(RoundedRectangle(cornerRadius: 6))
                                }

                                Text(project.title)
                                    .font(.caption.weight(.medium))
                                    .lineLimit(1)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 8)
                            .background(Color(.secondarySystemGroupedBackground), in: Capsule())
                            .foregroundStyle(.primary)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }

    // MARK: - Add Context Section

    private var addContextSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("ADD CONTEXT")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.secondary)
                .padding(.horizontal, 16)

            VStack(spacing: 0) {
                if viewModel.linkedProject == nil {
                    addContextRow(icon: "folder", label: "Link project") {
                        showProjectPicker = true
                    }
                    Divider().padding(.leading, 52)
                }

                addContextRow(icon: "tag", label: "Add yarn") {
                    showStashPicker = true
                }
                Divider().padding(.leading, 52)

                addContextRow(icon: "pencil.and.outline", label: "Add needle") {
                    showNeedlePicker = true
                }
                Divider().padding(.leading, 52)

                addContextRow(icon: "clock", label: "Log session time") {
                    showSessionLog = true
                }
            }
            .padding(.horizontal, 16)
        }
    }

    private func addContextRow(icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .frame(width: 28)
                Text(label)
                    .font(.subheadline)
                    .foregroundStyle(.primary)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption2)
                    .foregroundStyle(.quaternary)
            }
            .padding(.vertical, 12)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Bottom Bar

    private var bottomBar: some View {
        HStack {
            Spacer()
            Button {
                Task {
                    await viewModel.post()
                    if viewModel.didPost {
                        dismiss()
                        onPosted()
                    }
                }
            } label: {
                Text("Post")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 28)
                    .padding(.vertical, 10)
                    .background(
                        viewModel.canPost && !viewModel.isOverLimit
                            ? theme.primary : theme.primary.opacity(0.4),
                        in: Capsule()
                    )
            }
            .disabled(!viewModel.canPost || viewModel.isOverLimit)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.bar)
    }

    // MARK: - Helpers

    private func addYarnFromStash(stashItemId: String) async {
        do {
            let response: APIResponse<StashItem> = try await APIClient.shared.get("/stash/\(stashItemId)")
            let item = response.data
            let name: String
            if let company = item.yarn?.company?.name, let yarnName = item.yarn?.name {
                name = "\(company) \(yarnName)"
            } else {
                name = item.yarn?.name ?? "Unknown yarn"
            }
            viewModel.taggedYarns.append(.init(
                name: name, colorway: item.colorway, weight: item.yarn?.weight
            ))
        } catch {
            viewModel.error = error.localizedDescription
        }
    }
}

// MARK: - Project Picker for Posts

private struct PostProjectPickerSheet: View {
    let onSelect: (ComposePostViewModel.LinkedProject) -> Void
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss
    @State private var projects: [Project] = []
    @State private var isLoading = true

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if projects.isEmpty {
                    ContentUnavailableView("No projects", systemImage: "folder", description: Text("Create a project first"))
                } else {
                    List(projects) { project in
                        Button {
                            let linked = ComposePostViewModel.LinkedProject(
                                id: project.id,
                                title: project.title,
                                coverUrl: project.coverImageUrl,
                                patternTitle: project.pattern?.title,
                                patternId: project.pattern?.id,
                                yarns: (project.yarns ?? []).map { y in
                                    .init(name: y.displayName, colorway: y.colorway, weight: y.yarn?.weight)
                                },
                                needles: (project.needles ?? []).map { n in
                                    .init(label: n.displayLabel)
                                }
                            )
                            onSelect(linked)
                            dismiss()
                        } label: {
                            HStack(spacing: 12) {
                                if let coverUrl = project.coverImageUrl, let url = URL(string: coverUrl) {
                                    AsyncImage(url: url) { image in
                                        image.resizable().scaledToFill()
                                    } placeholder: {
                                        Color(.systemGray5)
                                    }
                                    .frame(width: 44, height: 44)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                } else {
                                    RoundedRectangle(cornerRadius: 8)
                                        .fill(Color(.systemGray5))
                                        .frame(width: 44, height: 44)
                                }

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(project.title)
                                        .font(.subheadline.weight(.medium))
                                    Text(project.status.capitalized)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .navigationTitle("Link project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .task {
            do {
                let response: APIResponse<GroupedProjects> = try await APIClient.shared.get("/projects/grouped")
                projects = response.data.inProgress + response.data.completed
            } catch {
                // Non-critical
            }
            isLoading = false
        }
    }
}

// MARK: - Needle Picker for Posts

private struct PostNeedlePickerSheet: View {
    let onSelect: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var needles: [Needle] = []
    @State private var isLoading = true

    private struct NeedlesData: Decodable { let items: [Needle] }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if needles.isEmpty {
                    ContentUnavailableView("No needles", systemImage: "pencil.and.outline", description: Text("Add needles to your collection first"))
                } else {
                    List(needles) { needle in
                        Button {
                            onSelect(needle.displayLabel)
                            dismiss()
                        } label: {
                            Text(needle.displayLabel)
                                .font(.subheadline)
                        }
                        .buttonStyle(.plain)
                    }
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
        .task {
            do {
                let response: APIResponse<NeedlesData> = try await APIClient.shared.get("/needles")
                needles = response.data.items
            } catch {
                // Non-critical
            }
            isLoading = false
        }
    }
}

private extension Needle {
    var displayLabel: String {
        let typeLabel = type.replacingOccurrences(of: "_", with: " ").capitalized
        let size = sizeLabel ?? "\(String(format: sizeMm.truncatingRemainder(dividingBy: 1) == 0 ? "%.0f" : "%.2g", sizeMm))mm"
        var label = "\(size) \(typeLabel)"
        if let cm = lengthCm { label += ", \(cm)cm" }
        return label
    }
}

// MARK: - Session Log Sheet

private struct SessionLogSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var minutes: Int?
    @Binding var rows: Int?

    @State private var hrs = 0
    @State private var mins = 30
    @State private var rowCount = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Time spent") {
                    HStack {
                        Picker("Hours", selection: $hrs) {
                            ForEach(0..<13) { Text("\($0)h").tag($0) }
                        }
                        .pickerStyle(.wheel)
                        .frame(width: 100)

                        Picker("Minutes", selection: $mins) {
                            ForEach([0, 5, 10, 15, 20, 30, 45], id: \.self) { Text("\($0)m").tag($0) }
                        }
                        .pickerStyle(.wheel)
                        .frame(width: 100)
                    }
                    .frame(height: 120)
                }

                Section("Rows completed (optional)") {
                    TextField("How many rows?", text: $rowCount)
                        .keyboardType(.numberPad)
                }
            }
            .navigationTitle("Log session")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let total = hrs * 60 + mins
                        minutes = total > 0 ? total : nil
                        rows = Int(rowCount)
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
            .onAppear {
                if let m = minutes { hrs = m / 60; mins = m % 60 }
                if let r = rows { rowCount = String(r) }
            }
        }
        .presentationDetents([.medium])
    }
}
