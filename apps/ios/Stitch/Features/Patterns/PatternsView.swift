import SwiftUI

enum PatternsTab: String, CaseIterable {
    case myPatterns
    case discover
    case learn

    var label: String {
        switch self {
        case .myPatterns: return "My patterns"
        case .discover: return "Discover"
        case .learn: return "Learn"
        }
    }
}

struct PatternsView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(SubscriptionManager.self) private var subscriptions
    @Binding var initialSubTab: PatternsTab
    @State private var viewModel = PatternsViewModel()
    @State private var selectedTab: PatternsTab = .myPatterns
    @State private var showUploadSheet = false
    @State private var showNewFolder = false
    @State private var newFolderName = ""
    @State private var folderToRename: PatternFolder?
    @State private var renameText = ""
    @State private var folderToDelete: PatternFolder?
    @State private var patternToMove: Pattern?
    @AppStorage("patternsLayout") private var layout: PatternsLayout = .list
    @AppStorage("patternsSort") private var sort: PatternsSort = .recentlyUpdated
    @State private var navigationPath = NavigationPath()
    @State private var showProPaywall = false
    @State private var showAIBuilder = false

    var body: some View {
        NavigationStack(path: $navigationPath) {
            VStack(spacing: 0) {
                tabPicker
                tabContent
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar(.hidden, for: .navigationBar)
            .safeAreaInset(edge: .top) { patternsHeader }
            .navigationDestination(for: Route.self) { route in
                switch route {
                case .patternDetail(let id):
                    PatternDetailView(patternId: id, onDelete: {
                        Task { await viewModel.loadRoot() }
                    })
                case .patternFolder(let id, let name):
                    PatternFolderView(folderId: id, folderName: name, viewModel: viewModel)
                case .patternBuilder(let id):
                    PatternBuilderView(patternId: id)
                case .communityPatternDetail(let id):
                    CommunityPatternDetailView(patternId: id)
                case .ravelryPatternDetail(let ravelryId, let name, let photoUrl):
                    RavelryPatternDetailView(ravelryId: ravelryId, patternName: name, previewPhotoUrl: photoUrl)
                case .glossaryBrowse(let category):
                    GlossaryView(initialCategory: category)
                case .glossaryDetail(let slug):
                    GlossaryDetailView(slug: slug)
                case .tutorialBrowse:
                    TutorialListView()
                case .tutorialDetail(let id):
                    TutorialDetailView(tutorialId: id)
                case .marketplace:
                    MarketplaceView()
                case .marketplaceDetail(let id):
                    MarketplacePatternDetailView(patternId: id)
                default:
                    EmptyView()
                }
            }
        }
        .task { await viewModel.loadRoot() }
        .onChange(of: navigationPath) {
            // Reload when navigating back (e.g., after creating/editing a pattern)
            if navigationPath.isEmpty {
                Task { await viewModel.loadRoot() }
            }
        }
        .onChange(of: initialSubTab) { _, newValue in
            selectedTab = newValue
        }
        .sheet(isPresented: $showUploadSheet) {
            PDFParseFlowView { projectId in
                // Navigate to the new project
                // The projects tab handles navigation via its own router
            }
        }
        .fullScreenCover(isPresented: $showAIBuilder) {
            AIPatternBuilderView()
                .onDisappear {
                    Task { await viewModel.loadRoot() }
                }
        }
        .alert("New folder", isPresented: $showNewFolder) {
            TextField("Folder name", text: $newFolderName)
            Button("Cancel", role: .cancel) { newFolderName = "" }
            Button("Create") {
                let name = newFolderName.trimmingCharacters(in: .whitespaces)
                newFolderName = ""
                guard !name.isEmpty else { return }
                Task { await viewModel.createFolder(name: name) }
            }
        } message: {
            Text("Enter a name for the new folder.")
        }
        .alert("Rename folder", isPresented: .init(
            get: { folderToRename != nil },
            set: { if !$0 { folderToRename = nil } }
        )) {
            TextField("Folder name", text: $renameText)
            Button("Cancel", role: .cancel) { folderToRename = nil }
            Button("Rename") {
                guard let folder = folderToRename else { return }
                let name = renameText.trimmingCharacters(in: .whitespaces)
                folderToRename = nil
                guard !name.isEmpty else { return }
                Task { await viewModel.renameFolder(folder, to: name) }
            }
        }
        .confirmationDialog(
            "Delete folder?",
            isPresented: .init(
                get: { folderToDelete != nil },
                set: { if !$0 { folderToDelete = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Delete folder", role: .destructive) {
                guard let folder = folderToDelete else { return }
                folderToDelete = nil
                Task { await viewModel.deleteFolder(folder) }
            }
            Button("Cancel", role: .cancel) { folderToDelete = nil }
        } message: {
            Text("Patterns inside will be moved out, not deleted.")
        }
        .sheet(item: $patternToMove) { pattern in
            MoveToFolderSheet(
                pattern: pattern,
                folders: viewModel.folders,
                onMove: { folderId in
                    Task { await viewModel.movePattern(pattern, toFolder: folderId) }
                }
            )
        }
        .errorAlert(error: $viewModel.error)
        .sheet(isPresented: $showProPaywall) {
            StitchPaywallView()
        }
    }

    // MARK: - Header

    private var patternsHeader: some View {
        HStack(alignment: .center) {
            Text("Patterns")
                .font(.largeTitle.bold())
            Spacer()
            if selectedTab == .myPatterns {
                HStack(spacing: 16) {
                    patternsSortPicker
                    patternsLayoutPicker

                    Menu {
                        Button {
                            if subscriptions.isPro {
                                showAIBuilder = true
                            } else {
                                showProPaywall = true
                            }
                        } label: {
                            Label(
                                subscriptions.isPro ? "AI pattern builder" : "AI pattern builder (Pro)",
                                systemImage: "sparkles"
                            )
                        }
                        Button {
                            navigationPath.append(Route.patternBuilder())
                        } label: {
                            Label("Build a pattern", systemImage: "hammer")
                        }
                        Button {
                            showUploadSheet = true
                        } label: {
                            Label("Upload PDF", systemImage: "doc.badge.plus")
                        }
                        Button {
                            showNewFolder = true
                        } label: {
                            Label("New folder", systemImage: "folder.badge.plus")
                        }
                    } label: {
                        Image(systemName: "plus")
                            .font(.body.weight(.medium))
                    }
                }
                .foregroundStyle(theme.primary)
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 4)
        .background(Color(.systemBackground))
    }

    private var patternsSortPicker: some View {
        Menu {
            ForEach(PatternsSort.allCases, id: \.self) { option in
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

    private var patternsLayoutPicker: some View {
        Menu {
            ForEach(PatternsLayout.allCases, id: \.self) { mode in
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

    // MARK: - Tab Picker

    private var tabPicker: some View {
        HStack(spacing: 0) {
            ForEach(PatternsTab.allCases, id: \.self) { tab in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { selectedTab = tab }
                } label: {
                    VStack(spacing: 6) {
                        Text(tab.label)
                            .font(.subheadline.weight(selectedTab == tab ? .semibold : .regular))
                            .foregroundStyle(selectedTab == tab ? .primary : .secondary)
                        Rectangle()
                            .fill(selectedTab == tab ? theme.primary : .clear)
                            .frame(height: 2)
                    }
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, 16)
        .background(Color(.systemBackground))
    }

    // MARK: - Tab Content

    @ViewBuilder
    private var tabContent: some View {
        switch selectedTab {
        case .myPatterns:
            myPatternsContent
                .refreshable { await viewModel.loadRoot() }
        case .discover:
            DiscoverContainerView()
        case .learn:
            LearnView()
        }
    }

    // MARK: - My Patterns Content

    @ViewBuilder
    private var myPatternsContent: some View {
        if viewModel.isLoading && viewModel.folders.isEmpty && viewModel.patterns.isEmpty {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if viewModel.folders.isEmpty && viewModel.patterns.isEmpty {
            emptyState
        } else {
            VStack(spacing: 0) {
                searchAndFilters
                scrollContent
            }
        }
    }

    // MARK: - Search & Filters

    private var searchAndFilters: some View {
        VStack(spacing: 8) {
            // Search bar
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                TextField("Search patterns", text: $viewModel.searchText)
                    .font(.subheadline)
                    .textFieldStyle(.plain)
                if !viewModel.searchText.isEmpty {
                    Button {
                        viewModel.searchText = ""
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 10))
            .padding(.horizontal, 16)

            // Filter chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(PatternFilter.allCases) { filter in
                        let count = viewModel.filterCounts[filter] ?? 0
                        let isActive = viewModel.activeFilter == filter
                        if filter == .all || count > 0 {
                            Button {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    viewModel.activeFilter = isActive && filter != .all ? .all : filter
                                }
                            } label: {
                                HStack(spacing: 4) {
                                    Image(systemName: filter.icon)
                                        .font(.caption2)
                                    Text(filter.label)
                                        .font(.caption.weight(.medium))
                                    if filter != .all && count > 0 {
                                        Text("\(count)")
                                            .font(.caption2.weight(.semibold))
                                            .foregroundStyle(isActive ? .white.opacity(0.8) : .secondary)
                                    }
                                }
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(isActive ? theme.primary : Color(.secondarySystemGroupedBackground), in: Capsule())
                                .foregroundStyle(isActive ? .white : .primary)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(.horizontal, 16)
            }
        }
        .padding(.vertical, 8)
    }

    private var emptyState: some View {
        ContentUnavailableView {
            Label("No patterns yet", systemImage: "book.closed")
        } description: {
            Text("Upload a PDF or discover patterns.")
        } actions: {
            Button {
                withAnimation { selectedTab = .discover }
            } label: {
                Label("Discover patterns", systemImage: "magnifyingglass")
            }
            .buttonStyle(.borderedProminent)
            .tint(theme.primary)

            Button {
                showUploadSheet = true
            } label: {
                Label("Upload PDF", systemImage: "doc.badge.plus")
            }
            .buttonStyle(.bordered)
        }
    }

    private var sortedPatterns: [Pattern] {
        sort.sorted(viewModel.filteredPatterns)
    }

    private var isSearchingOrFiltering: Bool {
        !viewModel.searchText.isEmpty || viewModel.activeFilter != .all
    }

    private var scrollContent: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 20) {
                if !viewModel.folders.isEmpty && !isSearchingOrFiltering {
                    foldersSection
                }
                if !sortedPatterns.isEmpty {
                    patternsSection
                } else if isSearchingOrFiltering {
                    ContentUnavailableView.search(text: viewModel.searchText)
                        .padding(.top, 40)
                }
            }
            .padding(.bottom, 32)
        }
    }

    // MARK: - Folders Section

    private var foldersSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Folders")
                .font(.headline)
                .padding(.horizontal)

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 12),
                GridItem(.flexible(), spacing: 12),
            ], spacing: 12) {
                ForEach(viewModel.folders) { folder in
                    NavigationLink(value: Route.patternFolder(id: folder.id, name: folder.name)) {
                        FolderCard(folder: folder)
                    }
                    .buttonStyle(.plain)
                    .contextMenu {
                        Button {
                            renameText = folder.name
                            folderToRename = folder
                        } label: {
                            Label("Rename", systemImage: "pencil")
                        }
                        Button(role: .destructive) {
                            folderToDelete = folder
                        } label: {
                            Label("Delete folder", systemImage: "trash")
                        }
                    }
                }
            }
            .padding(.horizontal)
        }
    }

    // MARK: - Unfiled Patterns Section

    private var patternsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            if !viewModel.folders.isEmpty {
                Text("Unfiled")
                    .font(.headline)
                    .padding(.horizontal)
            }

            switch layout {
            case .grid:
                patternGrid(sortedPatterns)
            case .list:
                patternListContent(sortedPatterns)
            case .largeList:
                patternLargeListContent(sortedPatterns)
            }
        }
    }

    // MARK: - Grid Layout

    private func patternGrid(_ patterns: [Pattern]) -> some View {
        LazyVGrid(columns: [
            GridItem(.flexible(), spacing: 14),
            GridItem(.flexible(), spacing: 14),
        ], spacing: 16) {
            ForEach(patterns) { pattern in
                NavigationLink(value: Route.patternDetail(id: pattern.id)) {
                    PatternGridCard(pattern: pattern)
                }
                .buttonStyle(.plain)
                .contextMenu { patternContextMenu(pattern) }
            }
        }
        .padding(.horizontal, 16)
    }

    // MARK: - List Layout

    private func patternListContent(_ patterns: [Pattern]) -> some View {
        VStack(spacing: 0) {
            ForEach(patterns) { pattern in
                NavigationLink(value: Route.patternDetail(id: pattern.id)) {
                    PatternRow(pattern: pattern)
                }
                .buttonStyle(.plain)
                .contextMenu { patternContextMenu(pattern) }
            }
        }
    }

    // MARK: - Large Layout

    private func patternLargeListContent(_ patterns: [Pattern]) -> some View {
        VStack(spacing: 16) {
            ForEach(patterns) { pattern in
                NavigationLink(value: Route.patternDetail(id: pattern.id)) {
                    PatternLargeCard(pattern: pattern)
                }
                .buttonStyle(.plain)
                .contextMenu { patternContextMenu(pattern) }
            }
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Context Menu

    @ViewBuilder
    private func patternContextMenu(_ pattern: Pattern) -> some View {
        Button {
            patternToMove = pattern
        } label: {
            Label("Move to folder", systemImage: "folder")
        }
    }

}
