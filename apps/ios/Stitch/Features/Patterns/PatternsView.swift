import SwiftUI

enum PatternsTab: String, CaseIterable {
    case myPatterns
    case discover

    var label: String {
        switch self {
        case .myPatterns: return "My patterns"
        case .discover: return "Discover"
        }
    }
}

struct PatternsView: View {
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

    var body: some View {
        NavigationStack {
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
                    PatternDetailView(patternId: id)
                case .patternFolder(let id, let name):
                    PatternFolderView(folderId: id, folderName: name, viewModel: viewModel)
                case .ravelryPatternDetail(let ravelryId, let name, let photoUrl):
                    RavelryPatternDetailView(ravelryId: ravelryId, patternName: name, previewPhotoUrl: photoUrl)
                default:
                    EmptyView()
                }
            }
        }
        .task { await viewModel.loadRoot() }
        .sheet(isPresented: $showUploadSheet) { PDFUploadView() }
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
        .alert("Error", isPresented: .init(
            get: { viewModel.error != nil },
            set: { if !$0 { viewModel.error = nil } }
        )) {
            Button("OK") { viewModel.error = nil }
        } message: {
            Text(viewModel.error ?? "")
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
                .foregroundStyle(Color(hex: "#FF6B6B"))
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
                            .fill(selectedTab == tab ? Color(hex: "#FF6B6B") : .clear)
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
            PatternDiscoverView()
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
            scrollContent
        }
    }

    private var emptyState: some View {
        ContentUnavailableView {
            Label("No patterns yet", systemImage: "book.closed")
        } description: {
            Text("Upload a PDF or discover patterns from Ravelry.")
        } actions: {
            Button {
                withAnimation { selectedTab = .discover }
            } label: {
                Label("Discover patterns", systemImage: "magnifyingglass")
            }
            .buttonStyle(.borderedProminent)
            .tint(Color(hex: "#FF6B6B"))

            Button {
                showUploadSheet = true
            } label: {
                Label("Upload PDF", systemImage: "doc.badge.plus")
            }
            .buttonStyle(.bordered)
        }
    }

    private var sortedPatterns: [Pattern] {
        sort.sorted(viewModel.patterns)
    }

    private var scrollContent: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 20) {
                if !viewModel.folders.isEmpty {
                    foldersSection
                }
                if !sortedPatterns.isEmpty {
                    patternsSection
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

// MARK: - Folder Card

private struct FolderCard: View {
    let folder: PatternFolder

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "folder.fill")
                .font(.title3)
                .foregroundStyle(folderColor)

            VStack(alignment: .leading, spacing: 2) {
                Text(folder.name)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)
                    .foregroundStyle(.primary)

                let count = folder.count?.patterns ?? 0
                Text("\(count) \(count == 1 ? "pattern" : "patterns")")
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
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var folderColor: Color {
        if let hex = folder.color {
            return Color(hex: hex)
        }
        return Color(hex: "#FF6B6B")
    }
}

// MARK: - Pattern Row

struct PatternRow: View {
    let pattern: Pattern

    private var hasPatternData: Bool {
        pattern.aiParsed || pattern.pdfUrl != nil || pattern.designerName != nil || pattern.difficulty != nil
    }

    var body: some View {
        HStack(spacing: 12) {
            patternCover
            patternInfo
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 6)
    }

    private var patternCover: some View {
        ZStack {
            if let coverUrl = pattern.coverImageUrl, let url = URL(string: coverUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    default:
                        patternCoverPlaceholder
                    }
                }
            } else {
                patternCoverPlaceholder
            }
        }
        .frame(width: 50, height: 70)
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    private var patternCoverPlaceholder: some View {
        ZStack {
            Color(.systemGray5)
            Image(systemName: "book.closed")
                .font(.system(size: 16))
                .foregroundStyle(.quaternary)
        }
    }

    private var patternInfo: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(pattern.title)
                .font(.subheadline.weight(.medium))
                .lineLimit(2)
                .foregroundStyle(.primary)

            if let designer = pattern.designerName {
                Text(designer)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 6) {
                if let difficulty = pattern.difficulty {
                    Text(difficulty.capitalized)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                if pattern.aiParsed {
                    Label("AI parsed", systemImage: "sparkles")
                        .font(.caption2)
                        .foregroundStyle(.purple)
                }
                if !hasPatternData {
                    Label("Saved from Ravelry", systemImage: "arrow.down.circle")
                        .font(.caption2)
                        .foregroundStyle(.orange)
                }
            }
        }
    }
}

// MARK: - Folder Detail View

struct PatternFolderView: View {
    let folderId: String
    let folderName: String
    @Bindable var viewModel: PatternsViewModel
    @State private var showNewSubfolder = false
    @State private var newSubfolderName = ""
    @State private var patternToMove: Pattern?

    var body: some View {
        Group {
            if viewModel.isFolderLoading && viewModel.folderPatterns.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if viewModel.folderChildren.isEmpty && viewModel.folderPatterns.isEmpty {
                ContentUnavailableView(
                    "Empty folder",
                    systemImage: "folder",
                    description: Text("Move patterns here to organize your library.")
                )
            } else {
                folderScrollContent
            }
        }
        .navigationTitle(folderName)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    showNewSubfolder = true
                } label: {
                    Image(systemName: "folder.badge.plus")
                }
            }
        }
        .task { await viewModel.loadFolder(PatternFolder(
            id: folderId, parentId: nil, name: folderName, color: nil,
            sortOrder: 0, createdAt: .now, updatedAt: .now
        )) }
        .alert("New subfolder", isPresented: $showNewSubfolder) {
            TextField("Folder name", text: $newSubfolderName)
            Button("Cancel", role: .cancel) { newSubfolderName = "" }
            Button("Create") {
                let name = newSubfolderName.trimmingCharacters(in: .whitespaces)
                newSubfolderName = ""
                guard !name.isEmpty else { return }
                Task { await viewModel.createFolder(name: name, parentId: folderId) }
            }
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
    }

    private var folderScrollContent: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 20) {
                if !viewModel.folderChildren.isEmpty {
                    subfoldersGrid
                }
                patternsInFolder
            }
            .padding(.bottom, 32)
        }
    }

    private var subfoldersGrid: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Subfolders")
                .font(.headline)
                .padding(.horizontal)

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 12),
                GridItem(.flexible(), spacing: 12),
            ], spacing: 12) {
                ForEach(viewModel.folderChildren) { child in
                    NavigationLink(value: Route.patternFolder(id: child.id, name: child.name)) {
                        FolderCard(folder: child)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
        }
    }

    private var patternsInFolder: some View {
        VStack(alignment: .leading, spacing: 10) {
            if !viewModel.folderChildren.isEmpty && !viewModel.folderPatterns.isEmpty {
                Text("Patterns")
                    .font(.headline)
                    .padding(.horizontal)
            }

            ForEach(viewModel.folderPatterns) { pattern in
                NavigationLink(value: Route.patternDetail(id: pattern.id)) {
                    PatternRow(pattern: pattern)
                }
                .buttonStyle(.plain)
                .contextMenu {
                    Button {
                        patternToMove = pattern
                    } label: {
                        Label("Move to folder", systemImage: "folder")
                    }
                    Button {
                        Task { await viewModel.movePattern(pattern, toFolder: nil) }
                    } label: {
                        Label("Remove from folder", systemImage: "folder.badge.minus")
                    }
                }
            }
        }
    }
}

// MARK: - Move to Folder Sheet

private struct MoveToFolderSheet: View {
    let pattern: Pattern
    let folders: [PatternFolder]
    let onMove: (String?) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                if pattern.folderId != nil {
                    Button {
                        onMove(nil)
                        dismiss()
                    } label: {
                        Label("Remove from folder", systemImage: "tray")
                    }
                }

                ForEach(folders) { folder in
                    Button {
                        onMove(folder.id)
                        dismiss()
                    } label: {
                        Label {
                            HStack {
                                Text(folder.name)
                                Spacer()
                                if pattern.folderId == folder.id {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(Color(hex: "#FF6B6B"))
                                }
                            }
                        } icon: {
                            Image(systemName: "folder.fill")
                                .foregroundStyle(folder.color.map { Color(hex: $0) } ?? Color(hex: "#FF6B6B"))
                        }
                    }
                    .disabled(pattern.folderId == folder.id)
                }
            }
            .navigationTitle("Move to folder")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Pattern Grid Card

private struct PatternGridCard: View {
    let pattern: Pattern

    private var hasPatternData: Bool {
        pattern.aiParsed || pattern.pdfUrl != nil || pattern.designerName != nil || pattern.difficulty != nil
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            coverImage
            textContent
        }
    }

    private var coverImage: some View {
        ZStack(alignment: .topTrailing) {
            Color(.systemGray5)
                .aspectRatio(2.0/3.0, contentMode: .fit)
                .overlay {
                    if let coverUrl = pattern.coverImageUrl, let url = URL(string: coverUrl) {
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

            if !hasPatternData {
                Image(systemName: "arrow.down.circle.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(.orange)
                    .padding(6)
            }
        }
    }

    private var gridPlaceholder: some View {
        ZStack {
            Color(.systemGray5)
            Image(systemName: "book.closed")
                .font(.system(size: 28))
                .foregroundStyle(.quaternary)
        }
    }

    private var textContent: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(pattern.title)
                .font(.subheadline.weight(.semibold))
                .lineLimit(2)
                .foregroundStyle(.primary)

            if let designer = pattern.designerName {
                Text(designer)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            HStack(spacing: 6) {
                if let difficulty = pattern.difficulty {
                    Text(difficulty.capitalized)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                if pattern.aiParsed {
                    Label("AI parsed", systemImage: "sparkles")
                        .font(.caption2)
                        .foregroundStyle(.purple)
                } else if !hasPatternData {
                    Text("No pattern data")
                        .font(.caption2)
                        .foregroundStyle(.orange)
                }
            }
        }
    }
}

// MARK: - Pattern Large Card (Editorial)

private struct PatternLargeCard: View {
    let pattern: Pattern

    private var hasPatternData: Bool {
        pattern.aiParsed || pattern.pdfUrl != nil || pattern.designerName != nil || pattern.difficulty != nil
    }

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            heroImage
            gradient
            cardOverlay
        }
        .frame(maxWidth: .infinity)
        .frame(height: 260)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var heroImage: some View {
        Color(.systemGray5)
            .overlay {
                if let coverUrl = pattern.coverImageUrl, let url = URL(string: coverUrl) {
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
                if let difficulty = pattern.difficulty {
                    Text(difficulty.capitalized)
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(.white.opacity(0.2), in: RoundedRectangle(cornerRadius: 6))
                        .foregroundStyle(.white)
                }
                if pattern.aiParsed {
                    Label("AI parsed", systemImage: "sparkles")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(.purple.opacity(0.5), in: RoundedRectangle(cornerRadius: 6))
                        .foregroundStyle(.white)
                }
                if !hasPatternData {
                    Label("Saved from Ravelry", systemImage: "arrow.down.circle")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(.orange.opacity(0.7), in: RoundedRectangle(cornerRadius: 6))
                        .foregroundStyle(.white)
                }
            }

            Text(pattern.title)
                .font(.title3.weight(.bold))
                .foregroundStyle(.white)
                .lineLimit(2)

            if let designer = pattern.designerName {
                Text(designer)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.75))
            }

            HStack(spacing: 8) {
                Text(pattern.craftType.capitalized)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.75))
                if let garment = pattern.garmentType {
                    Text("·")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.5))
                    Text(garment.capitalized)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.75))
                }
            }
        }
        .padding(16)
    }
}
