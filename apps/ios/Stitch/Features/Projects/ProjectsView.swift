import SwiftUI
import SafariServices

struct ProjectsView: View {
    @Binding var selectedTab: AppTab
    @Binding var patternsSubTab: PatternsTab
    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = ProjectsViewModel()

    @State private var showingPatternPicker = false
    @State private var showPdfParseFlow = false
    @State private var showRavelryPrompt = false
    @State private var showDeleteConfirmation = false
    @State private var projectToDelete: Project?
    @AppStorage("projectsLayout") private var layout: ProjectsLayout = .grid
    @AppStorage("projectsSort") private var sort: ProjectsSort = .recentlyUpdated
    @State private var expandedSections: Set<String> = []

    @Environment(AppRouter.self) private var router: AppRouter

    var body: some View {
        @Bindable var router = router
        NavigationStack(path: $router.path) {
            mainScrollView
                .navigationBarTitleDisplayMode(.inline)
                .toolbar(.hidden, for: .navigationBar)
                .safeAreaInset(edge: .top) {
                    ProjectHeaderBar(
                        layout: $layout,
                        sort: $sort,
                        onNewFromPattern: { showingPatternPicker = true },
                        onUploadPdf: { showPdfParseFlow = true },
                        onBuildPattern: { buildNewPattern() }
                    )
                }
                .navigationDestination(for: Route.self) { route in
                    switch route {
                    case .projectDetail(let id):
                        ProjectDetailView(projectId: id)
                    case .counter(let sectionId, let allSections, let projectId, let pdfUploadId):
                        CounterView(sectionId: sectionId, allSections: allSections, projectId: projectId, pdfUploadId: pdfUploadId)
                    case .patternDetail(let id):
                        PatternDetailView(patternId: id)
                    case .patternBuilder(let id):
                        PatternBuilderView(patternId: id)
                    default:
                        EmptyView()
                    }
                }
        }
        .task {
            await viewModel.loadGrouped()
            await checkRavelryOnboarding()
        }
        .onChange(of: router.path) { oldPath, newPath in
            // Refresh when navigating back from detail views (path got shorter)
            if newPath.count < oldPath.count {
                Task { await viewModel.loadGrouped() }
            }
        }
        .refreshable {
            await viewModel.syncRavelry()
            await viewModel.loadGrouped()
        }
        .sheet(isPresented: $showingPatternPicker) {
            PatternPickerSheet(
                onSelect: { patternId in
                    if let project = await viewModel.createFromPattern(patternId: patternId) {
                        router.push(.projectDetail(id: project.id))
                    }
                },
                onDiscover: {
                    patternsSubTab = .discover
                    selectedTab = .patterns
                },
                onUploadPdf: {
                    showPdfParseFlow = true
                },
                onBuildPattern: {
                    buildNewPattern()
                }
            )
        }
        .sheet(isPresented: $showPdfParseFlow) {
            PDFParseFlowView { projectId in
                router.push(.projectDetail(id: projectId))
            }
        }
        .sheet(isPresented: $showRavelryPrompt) {
            RavelryOnboardingSheet(isPresented: $showRavelryPrompt)
        }
        .alert("Error", isPresented: .init(
            get: { viewModel.error != nil },
            set: { if !$0 { viewModel.error = nil } }
        )) {
            Button("OK") { viewModel.error = nil }
        } message: {
            Text(viewModel.error ?? "")
        }
        .alert(
            "Delete project",
            isPresented: $showDeleteConfirmation,
            presenting: projectToDelete
        ) { project in
            Button("Delete", role: .destructive) {
                Task { await viewModel.deleteProject(project) }
            }
            Button("Cancel", role: .cancel) {}
        } message: { project in
            Text("Are you sure you want to delete \"\(project.title)\"? This cannot be undone.")
        }
    }

    // MARK: - Main Scroll View

    @ViewBuilder
    private var mainScrollView: some View {
        if viewModel.isLoading && viewModel.inProgressProjects.isEmpty && viewModel.queueItems.isEmpty {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 28) {
                    inProgressSection
                    queueSection
                    completedSection
                }
                .padding(.top, 8)
                .padding(.bottom, 40)
            }
        }
    }

    private var sortedInProgress: [Project] {
        sort.sorted(viewModel.inProgressProjects)
    }

    private var sortedQueue: [QueueItem] {
        viewModel.queueItems.sorted { a, b in
            guard let pa = a.pattern, let pb = b.pattern else { return false }
            switch sort {
            case .newest: return (pa.createdAt ?? .distantPast) > (pb.createdAt ?? .distantPast)
            case .oldest: return (pa.createdAt ?? .distantPast) < (pb.createdAt ?? .distantPast)
            case .alphabetical: return pa.title.localizedCaseInsensitiveCompare(pb.title) == .orderedAscending
            case .recentlyUpdated: return (pa.updatedAt ?? .distantPast) > (pb.updatedAt ?? .distantPast)
            }
        }
    }

    private var sortedCompleted: [Project] {
        sort.sorted(viewModel.completedProjects)
    }

    // MARK: - In Progress Section

    @ViewBuilder
    private var inProgressSection: some View {
        if sortedInProgress.isEmpty {
            inProgressEmptyState
        } else {
            projectSection(
                title: "In progress",
                projects: sortedInProgress,
                sectionKey: "inProgress",
                showNew: true
            )
        }
    }

    private var inProgressEmptyState: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("In progress")
                .font(.title2.bold())
                .padding(.horizontal, 16)

            VStack(spacing: 12) {
                Image(systemName: "hands.and.sparkles")
                    .font(.system(size: 36))
                    .foregroundStyle(theme.primary.opacity(0.5))

                Text("Nothing on the needles")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.secondary)

                VStack(spacing: 10) {
                    Button {
                        showingPatternPicker = true
                    } label: {
                        Label("Start from pattern", systemImage: "book")
                            .font(.subheadline.weight(.medium))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(theme.primary)
                            .foregroundStyle(.white)
                            .clipShape(Capsule())
                    }

                    Button {
                        buildNewPattern()
                    } label: {
                        Label("Build a pattern", systemImage: "hammer")
                            .font(.subheadline.weight(.medium))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(theme.primary.opacity(0.15))
                            .foregroundStyle(theme.primary)
                            .clipShape(Capsule())
                    }

                    HStack(spacing: 12) {
                        Button {
                            patternsSubTab = .discover
                            selectedTab = .patterns
                        } label: {
                            Text("Find a pattern")
                                .font(.subheadline.weight(.medium))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(theme.primary.opacity(0.15))
                                .foregroundStyle(theme.primary)
                                .clipShape(Capsule())
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .padding(.horizontal, 16)
        }
    }

    // MARK: - Queue Section

    @ViewBuilder
    private var queueSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader(title: "Queue", count: sortedQueue.count, sectionKey: "queue")

            if sortedQueue.isEmpty {
                queueEmptyState
            } else {
                let isExpanded = expandedSections.contains("queue")
                let limit = layout.previewCount
                let visible = isExpanded ? sortedQueue : Array(sortedQueue.prefix(limit))

                switch layout {
                case .grid:
                    queueGrid(visible)
                case .list:
                    queueListContent(visible)
                case .largeList:
                    queueLargeListContent(visible)
                }

                if !isExpanded && sortedQueue.count > limit {
                    seeAllButton(remaining: sortedQueue.count - limit, sectionKey: "queue")
                }
            }
        }
    }

    private var queueEmptyState: some View {
        VStack(spacing: 10) {
            Image(systemName: "text.line.first.and.arrowtriangle.forward")
                .font(.system(size: 28))
                .foregroundStyle(theme.primary.opacity(0.4))

            Text("Queue is empty")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.secondary)

            Text("Save patterns you want to make next")
                .font(.caption)
                .foregroundStyle(.tertiary)

            Button {
                patternsSubTab = .discover
                selectedTab = .patterns
            } label: {
                Label("Find patterns", systemImage: "magnifyingglass")
                    .font(.caption.weight(.medium))
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(theme.primary.opacity(0.12))
                    .foregroundStyle(theme.primary)
                    .clipShape(Capsule())
            }
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .padding(.horizontal, 16)
    }

    // MARK: - Queue Grid

    private func queueGrid(_ items: [QueueItem]) -> some View {
        LazyVGrid(columns: [
            GridItem(.flexible(), spacing: 14),
            GridItem(.flexible(), spacing: 14),
        ], spacing: 16) {
            ForEach(items) { item in
                ZStack(alignment: .topTrailing) {
                    NavigationLink(value: Route.patternDetail(id: item.patternId)) {
                        QueueGridCard(item: item)
                    }
                    .buttonStyle(.plain)

                    // Remove button
                    Button {
                        Task { await viewModel.removeQueueItem(item) }
                    } label: {
                        Image(systemName: "xmark")
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(.white)
                            .padding(4)
                            .background(.black.opacity(0.5), in: Circle())
                    }
                    .buttonStyle(.plain)
                    .padding(6)
                }
                .contextMenu { queueContextMenu(item) }
            }
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Queue List

    private func queueListContent(_ items: [QueueItem]) -> some View {
        VStack(spacing: 0) {
            ForEach(items) { item in
                HStack(spacing: 0) {
                    NavigationLink(value: Route.patternDetail(id: item.patternId)) {
                        QueueListRow(item: item)
                    }
                    .buttonStyle(.plain)

                    Button {
                        Task { await viewModel.removeQueueItem(item) }
                    } label: {
                        Image(systemName: "xmark")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(.secondary)
                            .padding(8)
                    }
                    .buttonStyle(.plain)
                }
                .contextMenu { queueContextMenu(item) }
            }
        }
    }

    // MARK: - Queue Large List

    private func queueLargeListContent(_ items: [QueueItem]) -> some View {
        VStack(spacing: 16) {
            ForEach(items) { item in
                ZStack(alignment: .topTrailing) {
                    NavigationLink(value: Route.patternDetail(id: item.patternId)) {
                        QueueLargeCard(item: item)
                    }
                    .buttonStyle(.plain)

                    // Remove button
                    Button {
                        Task { await viewModel.removeQueueItem(item) }
                    } label: {
                        Image(systemName: "xmark")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(.white)
                            .padding(5)
                            .background(.black.opacity(0.5), in: Circle())
                    }
                    .buttonStyle(.plain)
                    .padding(8)
                }
                .contextMenu { queueContextMenu(item) }
            }
        }
        .padding(.horizontal, 16)
    }

    @ViewBuilder
    private func queueContextMenu(_ item: QueueItem) -> some View {
        Button {
            Task {
                if let project = await viewModel.startProjectFromQueue(item) {
                    router.path.append(Route.projectDetail(id: project.id))
                }
            }
        } label: {
            Label("Start project", systemImage: "play.fill")
        }

        Button(role: .destructive) {
            Task { await viewModel.removeQueueItem(item) }
        } label: {
            Label("Remove from queue", systemImage: "trash")
        }
    }

    // MARK: - Completed Section

    @ViewBuilder
    private var completedSection: some View {
        if sortedCompleted.isEmpty {
            completedEmptyState
        } else {
            projectSection(
                title: "Completed",
                projects: sortedCompleted,
                sectionKey: "completed",
                showNew: false
            )
        }
    }

    private var completedEmptyState: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Completed")
                .font(.title2.bold())
                .padding(.horizontal, 16)

            VStack(spacing: 10) {
                Image(systemName: "trophy")
                    .font(.system(size: 28))
                    .foregroundStyle(.yellow.opacity(0.6))

                Text("No finished projects yet")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.secondary)

                Text("Start a project and finish it to see it here")
                    .font(.caption)
                    .foregroundStyle(.tertiary)

                if viewModel.inProgressProjects.isEmpty {
                    Button {
                        showingPatternPicker = true
                    } label: {
                        Label("Start a project", systemImage: "play.fill")
                            .font(.caption.weight(.medium))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(theme.primary.opacity(0.12))
                            .foregroundStyle(theme.primary)
                            .clipShape(Capsule())
                    }
                    .padding(.top, 4)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .padding(.horizontal, 16)
        }
    }

    // MARK: - Project Section (reusable for all sections)

    private func projectSection(title: String, projects: [Project], sectionKey: String, showNew: Bool) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader(title: title, count: projects.count, sectionKey: sectionKey)

            let isExpanded = expandedSections.contains(sectionKey)
            let limit = layout.previewCount
            let visible = isExpanded ? projects : Array(projects.prefix(limit))

            switch layout {
            case .grid:
                projectGrid(visible)
            case .list:
                projectListContent(visible)
            case .largeList:
                projectLargeListContent(visible)
            }

            if !isExpanded && projects.count > limit {
                seeAllButton(remaining: projects.count - limit, sectionKey: sectionKey)
            }

            if showNew {
                newProjectButton
            }
        }
    }

    // MARK: - Section Header

    private func sectionHeader(title: String, count: Int, sectionKey: String) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .font(.title2.bold())
            Text("\(count)")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Spacer()
            if expandedSections.contains(sectionKey) {
                Button("Show less") {
                    _ = withAnimation(.easeInOut(duration: 0.25)) {
                        expandedSections.remove(sectionKey)
                    }
                }
                .font(.subheadline)
                .foregroundStyle(theme.primary)
            }
        }
        .padding(.horizontal, 16)
    }

    // MARK: - See All Button

    private func seeAllButton(remaining: Int, sectionKey: String) -> some View {
        Button {
            _ = withAnimation(.easeInOut(duration: 0.25)) {
                expandedSections.insert(sectionKey)
            }
        } label: {
            HStack {
                Text("See all (\(remaining) more)")
                    .font(.subheadline.weight(.medium))
                Image(systemName: "chevron.down")
                    .font(.caption)
            }
            .foregroundStyle(theme.primary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(theme.primary.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .padding(.horizontal, 16)
    }

    // MARK: - New Project Button

    private var newProjectButton: some View {
        HStack(spacing: 10) {
            Button {
                buildNewPattern()
            } label: {
                HStack {
                    Image(systemName: "hammer")
                        .font(.subheadline)
                    Text("Build a pattern")
                        .font(.subheadline.weight(.medium))
                }
                .foregroundStyle(theme.primary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(theme.primary.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            Button {
                showingPatternPicker = true
            } label: {
                HStack {
                    Image(systemName: "book")
                        .font(.subheadline)
                    Text("From pattern")
                        .font(.subheadline.weight(.medium))
                }
                .foregroundStyle(theme.primary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(theme.primary.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Grid Layout

    private func projectGrid(_ projects: [Project]) -> some View {
        LazyVGrid(columns: [
            GridItem(.flexible(), spacing: 14),
            GridItem(.flexible(), spacing: 14),
        ], spacing: 16) {
            ForEach(projects) { project in
                NavigationLink(value: Route.projectDetail(id: project.id)) {
                    ProjectGridCard(project: project)
                }
                .buttonStyle(.plain)
                .contextMenu { projectContextMenu(project) }
            }
        }
        .padding(.horizontal, 16)
    }

    // MARK: - List Layout

    private func projectListContent(_ projects: [Project]) -> some View {
        VStack(spacing: 0) {
            ForEach(projects) { project in
                NavigationLink(value: Route.projectDetail(id: project.id)) {
                    ProjectListRow(project: project)
                }
                .buttonStyle(.plain)
                .contextMenu { projectContextMenu(project) }
            }
        }
    }

    // MARK: - Large List Layout

    private func projectLargeListContent(_ projects: [Project]) -> some View {
        VStack(spacing: 16) {
            ForEach(projects) { project in
                NavigationLink(value: Route.projectDetail(id: project.id)) {
                    ProjectLargeCard(project: project)
                }
                .buttonStyle(.plain)
                .contextMenu { projectContextMenu(project) }
            }
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Context Menu

    @ViewBuilder
    private func projectContextMenu(_ project: Project) -> some View {
        Button(role: .destructive) {
            projectToDelete = project
            showDeleteConfirmation = true
        } label: {
            Label("Delete", systemImage: "trash")
        }
    }

    // MARK: - Helpers

    private func buildNewPattern() {
        router.push(.patternBuilder())
    }

    private func checkRavelryOnboarding() async {
        do {
            struct StatusResponse: Decodable { let connected: Bool }
            struct OnboardingData: Decodable { let ravelryPrompted: Bool? }

            let statusRes: APIResponse<StatusResponse> = try await APIClient.shared.get(
                "/integrations/ravelry/status"
            )
            let connected = statusRes.data.connected

            let onboardingRes: APIResponse<OnboardingData> = try await APIClient.shared.get(
                "/onboarding"
            )
            if !(onboardingRes.data.ravelryPrompted ?? false) && !connected {
                showRavelryPrompt = true
            }
        } catch {}
    }
}

// MARK: - Ravelry Onboarding Sheet

struct RavelryOnboardingSheet: View {
    @Binding var isPresented: Bool
    @Environment(ThemeManager.self) private var theme
    @State private var showSafari = false

    private var connectURL: URL {
        URL(string: AppConfig.apiBaseURL + "/integrations/ravelry/connect")!
    }

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: "yarnball")
                .font(.system(size: 60))
                .foregroundStyle(theme.primary)

            VStack(spacing: 8) {
                Text("Already on Ravelry?")
                    .font(.title2.bold())
                Text("Connect your account to import your projects, stash, and queue automatically.")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }

            VStack(spacing: 12) {
                Button {
                    Task { await markPrompted() }
                    showSafari = true
                } label: {
                    Text("Connect Ravelry")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(theme.primary)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                Button {
                    Task { await markPrompted() }
                } label: {
                    Text("Skip")
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal)

            Spacer()
        }
        .sheet(isPresented: $showSafari) {
            SafariSheetView(url: connectURL)
                .ignoresSafeArea()
        }
    }

    private func markPrompted() async {
        struct Empty: Decodable {}
        do {
            let _: APIResponse<Empty> = try await APIClient.shared.patch(
                "/onboarding",
                body: ["ravelry_prompted": true]
            )
        } catch {}
        isPresented = false
    }
}

private struct SafariSheetView: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> SFSafariViewController {
        SFSafariViewController(url: url)
    }
    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
}

// MARK: - Pattern Picker Sheet

struct PatternPickerSheet: View {
    let onSelect: (String) async -> Void
    var onDiscover: (() -> Void)?
    var onUploadPdf: (() -> Void)?
    var onBuildPattern: (() -> Void)?
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss
    @State private var patterns: [Pattern] = []
    @State private var isLoading = true
    @State private var searchText = ""
    @State private var isCreating = false

    private var filtered: [Pattern] {
        guard !searchText.isEmpty else { return patterns }
        let query = searchText.lowercased()
        return patterns.filter {
            $0.title.lowercased().contains(query) ||
            ($0.designerName?.lowercased().contains(query) ?? false)
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if patterns.isEmpty {
                    VStack(spacing: 16) {
                        Spacer()
                        Image(systemName: "book.closed")
                            .font(.system(size: 40))
                            .foregroundStyle(theme.primary.opacity(0.4))
                        Text("No patterns yet")
                            .font(.headline)
                        Text("Add a pattern to your library first")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        HStack(spacing: 12) {
                            Button {
                                dismiss()
                                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                                    onDiscover?()
                                }
                            } label: {
                                Label("Discover", systemImage: "magnifyingglass")
                                    .font(.subheadline.weight(.medium))
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 10)
                                    .background(theme.primary)
                                    .foregroundStyle(.white)
                                    .clipShape(Capsule())
                            }
                            Button {
                                dismiss()
                                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                                    onUploadPdf?()
                                }
                            } label: {
                                Label("Upload PDF", systemImage: "doc.badge.plus")
                                    .font(.subheadline.weight(.medium))
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 10)
                                    .background(theme.primary.opacity(0.15))
                                    .foregroundStyle(theme.primary)
                                    .clipShape(Capsule())
                            }
                        }
                        Button {
                            dismiss()
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                                onBuildPattern?()
                            }
                        } label: {
                            Label("Build a pattern", systemImage: "hammer")
                                .font(.subheadline.weight(.medium))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(theme.primary.opacity(0.15))
                                .foregroundStyle(theme.primary)
                                .clipShape(Capsule())
                        }
                        Spacer()
                    }
                    .frame(maxWidth: .infinity)
                } else {
                    List(filtered) { pattern in
                        Button {
                            guard !isCreating else { return }
                            isCreating = true
                            Task {
                                await onSelect(pattern.id)
                                dismiss()
                            }
                        } label: {
                            HStack(spacing: 12) {
                                // Cover thumbnail
                                if let coverUrl = pattern.coverImageUrl, let url = URL(string: coverUrl) {
                                    AsyncImage(url: url) { image in
                                        image.resizable().aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        Color(.systemGray5)
                                    }
                                    .frame(width: 44, height: 58)
                                    .clipShape(RoundedRectangle(cornerRadius: 6))
                                } else {
                                    RoundedRectangle(cornerRadius: 6)
                                        .fill(Color(.systemGray5))
                                        .frame(width: 44, height: 58)
                                        .overlay {
                                            Image(systemName: "book.closed")
                                                .font(.caption)
                                                .foregroundStyle(.tertiary)
                                        }
                                }

                                VStack(alignment: .leading, spacing: 3) {
                                    Text(pattern.title)
                                        .font(.subheadline.weight(.medium))
                                        .lineLimit(2)
                                    if let designer = pattern.designerName {
                                        Text(designer)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                    if let sections = pattern.sections, !sections.isEmpty {
                                        Text("\(sections.count) sections")
                                            .font(.caption2)
                                            .foregroundStyle(.tertiary)
                                    }
                                }

                                Spacer()

                                if isCreating {
                                    ProgressView()
                                        .controlSize(.small)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                        .disabled(isCreating)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Start from pattern")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $searchText, prompt: "Search patterns")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .task { await loadPatterns() }
        }
    }

    private func loadPatterns() async {
        do {
            let response: APIResponse<PaginatedData<Pattern>> = try await APIClient.shared.get(
                "/patterns?limit=100"
            )
            patterns = response.data.items
            isLoading = false
        } catch {
            isLoading = false
        }
    }
}

// MARK: - New Project Sheet

struct NewProjectSheet: View {
    let onCreate: (String) async -> Void
    @State private var title = ""
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                TextField("Project name", text: $title)
            }
            .navigationTitle("New project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        Task {
                            await onCreate(title)
                            dismiss()
                        }
                    }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
    }
}
