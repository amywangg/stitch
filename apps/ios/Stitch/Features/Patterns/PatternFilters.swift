import SwiftUI

// MARK: - Folder Card

struct FolderCard: View {
    @Environment(ThemeManager.self) private var theme
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
        return theme.primary
    }
}

// MARK: - Folder Detail View

struct PatternFolderView: View {
    @Environment(ThemeManager.self) private var theme
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

struct MoveToFolderSheet: View {
    @Environment(ThemeManager.self) private var theme
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
                                        .foregroundStyle(theme.primary)
                                }
                            }
                        } icon: {
                            Image(systemName: "folder.fill")
                                .foregroundStyle(folder.color.map { Color(hex: $0) } ?? theme.primary)
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

// MARK: - Discover Container (Community + Ravelry)

enum DiscoverSource: String, CaseIterable {
    case community = "Community"
    case marketplace = "Marketplace"
    case ravelry = "Ravelry"
}

struct DiscoverContainerView: View {
    @Environment(ThemeManager.self) private var theme
    @State private var source: DiscoverSource = .ravelry

    var body: some View {
        VStack(spacing: 0) {
            Picker("Source", selection: $source) {
                ForEach(DiscoverSource.allCases, id: \.self) { s in
                    Text(s.rawValue).tag(s)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .padding(.vertical, 8)

            switch source {
            case .community:
                CommunityPatternsView()
            case .marketplace:
                MarketplaceView()
            case .ravelry:
                PatternDiscoverView()
            }
        }
    }
}
