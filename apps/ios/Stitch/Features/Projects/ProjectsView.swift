import SwiftUI
import SafariServices

struct ProjectsView: View {
    @Binding var selectedTab: AppTab
    @Binding var patternsSubTab: PatternsTab
    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = ProjectsViewModel()
    @State private var showingNewProject = false
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
                .safeAreaInset(edge: .top) { headerBar }
                .navigationDestination(for: Route.self) { route in
                    switch route {
                    case .projectDetail(let id):
                        ProjectDetailView(projectId: id)
                    case .counter(let sectionId, let allSections, let projectId, let pdfUploadId):
                        CounterView(sectionId: sectionId, allSections: allSections, projectId: projectId, pdfUploadId: pdfUploadId)
                    case .patternDetail(let id):
                        PatternDetailView(patternId: id)
                    default:
                        EmptyView()
                    }
                }
        }
        .task {
            await viewModel.loadGrouped()
            await checkRavelryOnboarding()
        }
        .onAppear {
            // Refresh when returning from detail/counter views where status may have changed
            if !viewModel.inProgressProjects.isEmpty || !viewModel.completedProjects.isEmpty {
                Task { await viewModel.loadGrouped() }
            }
        }
        .refreshable {
            await viewModel.syncRavelry()
            await viewModel.loadGrouped()
        }
        .sheet(isPresented: $showingNewProject) {
            NewProjectSheet { title in
                await viewModel.createProject(title: title)
            }
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
        } else if viewModel.inProgressProjects.isEmpty && viewModel.queueItems.isEmpty && viewModel.completedProjects.isEmpty {
            // Truly empty — show in-progress empty state with CTAs
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 28) {
                    inProgressEmptyState
                }
                .padding(.top, 8)
                .padding(.bottom, 40)
            }
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
            case .newest: return pa.createdAt > pb.createdAt
            case .oldest: return pa.createdAt < pb.createdAt
            case .alphabetical: return pa.title.localizedCaseInsensitiveCompare(pb.title) == .orderedAscending
            case .recentlyUpdated: return pa.updatedAt > pb.updatedAt
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

                    HStack(spacing: 12) {
                        Button {
                            showingNewProject = true
                        } label: {
                            Text("Blank project")
                                .font(.subheadline.weight(.medium))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(theme.primary.opacity(0.15))
                                .foregroundStyle(theme.primary)
                                .clipShape(Capsule())
                        }

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
        if !sortedQueue.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                sectionHeader(title: "Queue", count: sortedQueue.count, sectionKey: "queue")

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

    // MARK: - Queue Grid

    private func queueGrid(_ items: [QueueItem]) -> some View {
        LazyVGrid(columns: [
            GridItem(.flexible(), spacing: 14),
            GridItem(.flexible(), spacing: 14),
        ], spacing: 16) {
            ForEach(items) { item in
                NavigationLink(value: Route.patternDetail(id: item.patternId)) {
                    QueueGridCard(item: item)
                }
                .buttonStyle(.plain)
                .contextMenu { queueContextMenu(item) }
            }
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Queue List

    private func queueListContent(_ items: [QueueItem]) -> some View {
        VStack(spacing: 0) {
            ForEach(items) { item in
                NavigationLink(value: Route.patternDetail(id: item.patternId)) {
                    QueueListRow(item: item)
                }
                .buttonStyle(.plain)
                .contextMenu { queueContextMenu(item) }
            }
        }
    }

    // MARK: - Queue Large List

    private func queueLargeListContent(_ items: [QueueItem]) -> some View {
        VStack(spacing: 16) {
            ForEach(items) { item in
                NavigationLink(value: Route.patternDetail(id: item.patternId)) {
                    QueueLargeCard(item: item)
                }
                .buttonStyle(.plain)
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
        if !sortedCompleted.isEmpty {
            projectSection(
                title: "Completed",
                projects: sortedCompleted,
                sectionKey: "completed",
                showNew: false
            )
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

            Button {
                showingNewProject = true
            } label: {
                HStack {
                    Image(systemName: "plus")
                        .font(.subheadline)
                    Text("Blank")
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

    // MARK: - Header Bar

    private var headerBar: some View {
        HStack(alignment: .center) {
            Text("Projects")
                .font(.largeTitle.bold())

            Spacer()

            HStack(spacing: 16) {
                sortPicker
                layoutPicker

                Menu {
                    Button {
                        showingPatternPicker = true
                    } label: {
                        Label("Start from pattern", systemImage: "book")
                    }
                    Button {
                        showPdfParseFlow = true
                    } label: {
                        Label("Upload PDF", systemImage: "doc.badge.plus")
                    }
                    Button {
                        showingNewProject = true
                    } label: {
                        Label("Blank project", systemImage: "plus")
                    }
                } label: {
                    Image(systemName: "plus")
                        .font(.body.weight(.medium))
                }
            }
            .foregroundStyle(theme.primary)
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
        .background(Color(.systemBackground))
    }

    private var sortPicker: some View {
        Menu {
            ForEach(ProjectsSort.allCases, id: \.self) { option in
                Button {
                    withAnimation(.easeInOut(duration: 0.25)) { sort = option }
                } label: {
                    Label {
                        Text(option.label)
                    } icon: {
                        if sort == option {
                            Image(systemName: "checkmark")
                        } else {
                            Image(systemName: option.icon)
                        }
                    }
                }
            }
        } label: {
            Image(systemName: "arrow.up.arrow.down")
                .font(.body.weight(.medium))
        }
    }

    private var layoutPicker: some View {
        Menu {
            ForEach(ProjectsLayout.allCases, id: \.self) { mode in
                Button {
                    withAnimation(.easeInOut(duration: 0.25)) { layout = mode }
                } label: {
                    Label(mode.label, systemImage: mode.icon)
                }
            }
        } label: {
            Image(systemName: layout.icon)
                .font(.body.weight(.medium))
                .contentTransition(.symbolEffect(.replace))
        }
    }

    // MARK: - Helpers

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

// MARK: - Shared Helpers

private func projectProgress(_ project: Project) -> Double? {
    guard let sections = project.sections, !sections.isEmpty else { return nil }
    let totalTarget = sections.compactMap(\.targetRows).reduce(0, +)
    guard totalTarget > 0 else { return nil }
    let totalCurrent = sections.map(\.currentRow).reduce(0, +)
    return min(Double(totalCurrent) / Double(totalTarget), 1.0)
}

private func projectStatusColor(_ status: String) -> Color {
    switch status {
    case "active": return Color(hex: "#4ECDC4")
    case "completed": return .green
    case "frogged": return .orange
    case "hibernating": return .purple
    case "queued": return Color(hex: "#FF6B6B")
    default: return .secondary
    }
}

// MARK: - Shared Components

private struct ProjectRavelryBadge: View {
    @Environment(ThemeManager.self) private var theme
    var body: some View {
        Text("R")
            .font(.system(size: 9, weight: .bold))
            .foregroundStyle(.white)
            .padding(.horizontal, 4)
            .padding(.vertical, 1)
            .background(theme.primary, in: RoundedRectangle(cornerRadius: 3))
    }
}

private struct ProjectStatusDot: View {
    @Environment(ThemeManager.self) private var theme
    let status: String
    var body: some View {
        Circle()
            .fill(projectStatusColor(status))
            .frame(width: 6, height: 6)
    }
}

private struct CircularProgress: View {
    let value: Double
    @Environment(ThemeManager.self) private var theme
    var body: some View {
        ZStack {
            Circle()
                .stroke(Color(.systemGray5), lineWidth: 3)
            Circle()
                .trim(from: 0, to: value)
                .stroke(theme.primary, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text("\(Int(value * 100))")
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(.secondary)
        }
    }
}

private struct ProjectTagChips: View {
    @Environment(ThemeManager.self) private var theme
    let tags: [ProjectTag]
    var limit: Int = 3
    var style: TagStyle = .normal

    enum TagStyle {
        case normal
        case onImage
    }

    var body: some View {
        HStack(spacing: 4) {
            ForEach(Array(tags.prefix(limit))) { tag in
                Text(tag.tag.name)
                    .font(.system(size: 10, weight: .medium))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(chipBackground)
                    .foregroundStyle(chipForeground)
                    .clipShape(Capsule())
            }
            if tags.count > limit {
                Text("+\(tags.count - limit)")
                    .font(.system(size: 10, weight: .medium))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(chipBackground)
                    .foregroundStyle(chipForeground)
                    .clipShape(Capsule())
            }
        }
    }

    private var chipBackground: some ShapeStyle {
        switch style {
        case .normal:
            return AnyShapeStyle(Color(.systemGray5))
        case .onImage:
            return AnyShapeStyle(Color.white.opacity(0.2))
        }
    }

    private var chipForeground: some ShapeStyle {
        switch style {
        case .normal:
            return AnyShapeStyle(Color.secondary)
        case .onImage:
            return AnyShapeStyle(Color.white.opacity(0.9))
        }
    }
}

// MARK: - Grid Card (Spotify-style)

private struct ProjectGridCard: View {
    let project: Project

    @Environment(ThemeManager.self) private var theme
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            coverImage
            textContent
        }
    }

    private var coverImage: some View {
        Color.clear
            .aspectRatio(1, contentMode: .fit)
            .overlay {
                if let photoURL = project.coverImageUrl, let url = URL(string: photoURL) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            gridPlaceholder
                        }
                    }
                } else {
                    gridPlaceholder
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var gridPlaceholder: some View {
        ZStack {
            Color(.systemGray5)
            Image(systemName: "photo")
                .font(.system(size: 28))
                .foregroundStyle(.quaternary)
        }
    }

    private var textContent: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 5) {
                Text(project.title)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
                    .foregroundStyle(.primary)

                if project.ravelryId != nil {
                    ProjectRavelryBadge()
                }
            }

            HStack(spacing: 6) {
                ProjectStatusDot(status: project.status)
                Text(project.status.replacingOccurrences(of: "_", with: " ").capitalized)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 4) {
                if project.pdfUploadId != nil {
                    Label("PDF", systemImage: "doc.fill")
                        .font(.caption2)
                        .foregroundStyle(.green)
                }
                if project.pattern?.aiParsed == true {
                    Label("Parsed", systemImage: "sparkles")
                        .font(.caption2)
                        .foregroundStyle(.purple)
                }
            }

            if let tags = project.tags, !tags.isEmpty {
                ProjectTagChips(tags: tags, limit: 2)
            }

            if let progress = projectProgress(project) {
                ProgressView(value: progress)
                    .tint(theme.primary)
                    .scaleEffect(y: 0.6)
                    .padding(.top, 2)
            }
        }
    }
}

// MARK: - List Row (Compact)

private struct ProjectListRow: View {
    @Environment(ThemeManager.self) private var theme
    let project: Project

    var body: some View {
        HStack(spacing: 12) {
            thumbnail
            titleAndMeta
            Spacer(minLength: 0)
            if let progress = projectProgress(project) {
                CircularProgress(value: progress)
                    .frame(width: 28, height: 28)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }

    private var thumbnail: some View {
        Color.clear
            .frame(width: 52, height: 52)
            .overlay {
                if let photoURL = project.coverImageUrl, let url = URL(string: photoURL) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            listPlaceholder
                        }
                    }
                } else {
                    listPlaceholder
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var listPlaceholder: some View {
        ZStack {
            Color(.systemGray5)
            Image(systemName: "photo")
                .font(.system(size: 16))
                .foregroundStyle(.quaternary)
        }
    }

    private var titleAndMeta: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(project.title)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)
                    .foregroundStyle(.primary)
                if project.ravelryId != nil {
                    ProjectRavelryBadge()
                }
            }
            HStack(spacing: 4) {
                ProjectStatusDot(status: project.status)
                Text(project.status.replacingOccurrences(of: "_", with: " ").capitalized)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text("·")
                    .font(.caption)
                    .foregroundStyle(.quaternary)
                Text(project.craftType.capitalized)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if project.pdfUploadId != nil {
                    Label("PDF", systemImage: "doc.fill")
                        .font(.caption2)
                        .foregroundStyle(.green)
                }
                if project.pattern?.aiParsed == true {
                    Label("Parsed", systemImage: "sparkles")
                        .font(.caption2)
                        .foregroundStyle(.purple)
                }
            }
            if let tags = project.tags, !tags.isEmpty {
                ProjectTagChips(tags: tags, limit: 3)
            }
        }
    }
}

// MARK: - Large Card (Editorial)

private struct ProjectLargeCard: View {
    let project: Project

    @Environment(ThemeManager.self) private var theme
    var body: some View {
        ZStack(alignment: .bottomLeading) {
            heroImage
            gradient
            cardOverlay
        }
        .frame(maxWidth: .infinity)
        .frame(height: 240)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var heroImage: some View {
        Color(.systemGray5)
            .overlay {
                if let photoURL = project.coverImageUrl, let url = URL(string: photoURL) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            largePlaceholder
                        }
                    }
                } else {
                    largePlaceholder
                }
            }
    }

    private var largePlaceholder: some View {
        ZStack {
            Color(.systemGray6)
            Image(systemName: "photo")
                .font(.system(size: 40))
                .foregroundStyle(.quaternary)
        }
    }

    private var gradient: some View {
        LinearGradient(
            colors: [.clear, .black.opacity(0.7)],
            startPoint: .top,
            endPoint: .bottom
        )
    }

    private var cardOverlay: some View {
        VStack(alignment: .leading, spacing: 6) {
            Spacer()

            HStack(spacing: 8) {
                statusPill
                if project.ravelryId != nil {
                    Text("R")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.white.opacity(0.9))
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(.white.opacity(0.2), in: RoundedRectangle(cornerRadius: 4))
                }
                if project.pdfUploadId != nil {
                    Label("PDF", systemImage: "doc.fill")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(.green.opacity(0.6), in: RoundedRectangle(cornerRadius: 6))
                        .foregroundStyle(.white)
                }
                if project.pattern?.aiParsed == true {
                    Label("Parsed", systemImage: "sparkles")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(.purple.opacity(0.5), in: RoundedRectangle(cornerRadius: 6))
                        .foregroundStyle(.white)
                }
            }

            Text(project.title)
                .font(.title3.weight(.bold))
                .foregroundStyle(.white)
                .lineLimit(2)

            HStack(spacing: 8) {
                Text(project.craftType.capitalized)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.75))
                if let yarn = project.yarns?.first?.yarn {
                    Text("·")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.5))
                    Text(yarn.name)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.75))
                        .lineLimit(1)
                }
            }

            if let tags = project.tags, !tags.isEmpty {
                ProjectTagChips(tags: tags, limit: 3, style: .onImage)
            }

            if let progress = projectProgress(project) {
                ProgressView(value: progress)
                    .tint(theme.primary)
                    .background(Color.white.opacity(0.2), in: Capsule())
            }
        }
        .padding(16)
    }

    private var statusPill: some View {
        Text(project.status.replacingOccurrences(of: "_", with: " ").capitalized)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(projectStatusColor(project.status).opacity(0.85))
            .foregroundStyle(.white)
            .clipShape(Capsule())
    }
}

// MARK: - Queue Grid Card

private struct QueueGridCard: View {
    let item: QueueItem
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            coverImage
            textContent
        }
    }

    private var coverImage: some View {
        Color.clear
            .aspectRatio(1, contentMode: .fit)
            .overlay {
                if let coverUrl = item.pattern?.coverImageUrl, let url = URL(string: coverUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            placeholder
                        }
                    }
                } else {
                    placeholder
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var placeholder: some View {
        ZStack {
            Color(.systemGray5)
            Image(systemName: "book.closed")
                .font(.system(size: 28))
                .foregroundStyle(.quaternary)
        }
    }

    private var textContent: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 5) {
                Text(item.pattern?.title ?? "Unknown pattern")
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
                    .foregroundStyle(.primary)
                if item.ravelryQueueId != nil {
                    ProjectRavelryBadge()
                }
            }
            HStack(spacing: 6) {
                ProjectStatusDot(status: "queued")
                Text("Queued")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            if let designer = item.pattern?.designerName {
                Text(designer)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
    }
}

// MARK: - Queue List Row

private struct QueueListRow: View {
    let item: QueueItem
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        HStack(spacing: 12) {
            thumbnail
            titleAndMeta
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }

    private var thumbnail: some View {
        Color.clear
            .frame(width: 52, height: 52)
            .overlay {
                if let coverUrl = item.pattern?.coverImageUrl, let url = URL(string: coverUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            placeholder
                        }
                    }
                } else {
                    placeholder
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var placeholder: some View {
        ZStack {
            Color(.systemGray5)
            Image(systemName: "book.closed")
                .font(.system(size: 16))
                .foregroundStyle(.quaternary)
        }
    }

    private var titleAndMeta: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(item.pattern?.title ?? "Unknown pattern")
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)
                    .foregroundStyle(.primary)
                if item.ravelryQueueId != nil {
                    ProjectRavelryBadge()
                }
            }
            HStack(spacing: 4) {
                ProjectStatusDot(status: "queued")
                Text("Queued")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if let craft = item.pattern?.craftType {
                    Text("·")
                        .font(.caption)
                        .foregroundStyle(.quaternary)
                    Text(craft.capitalized)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            if let designer = item.pattern?.designerName {
                Text(designer)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
    }
}

// MARK: - Queue Large Card

private struct QueueLargeCard: View {
    let item: QueueItem
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            heroImage
            gradient
            cardOverlay
        }
        .frame(maxWidth: .infinity)
        .frame(height: 240)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var heroImage: some View {
        Color(.systemGray5)
            .overlay {
                if let coverUrl = item.pattern?.coverImageUrl, let url = URL(string: coverUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            largePlaceholder
                        }
                    }
                } else {
                    largePlaceholder
                }
            }
    }

    private var largePlaceholder: some View {
        ZStack {
            Color(.systemGray6)
            Image(systemName: "book.closed")
                .font(.system(size: 40))
                .foregroundStyle(.quaternary)
        }
    }

    private var gradient: some View {
        LinearGradient(
            colors: [.clear, .black.opacity(0.7)],
            startPoint: .top,
            endPoint: .bottom
        )
    }

    private var cardOverlay: some View {
        VStack(alignment: .leading, spacing: 6) {
            Spacer()

            HStack(spacing: 8) {
                Text("Queued")
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(projectStatusColor("queued").opacity(0.85))
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
                if item.ravelryQueueId != nil {
                    Text("R")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.white.opacity(0.9))
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(.white.opacity(0.2), in: RoundedRectangle(cornerRadius: 4))
                }
            }

            Text(item.pattern?.title ?? "Unknown pattern")
                .font(.title3.weight(.bold))
                .foregroundStyle(.white)
                .lineLimit(2)

            HStack(spacing: 8) {
                if let craft = item.pattern?.craftType {
                    Text(craft.capitalized)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.75))
                }
                if let designer = item.pattern?.designerName {
                    Text("·")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.5))
                    Text(designer)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.75))
                        .lineLimit(1)
                }
            }
        }
        .padding(16)
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
