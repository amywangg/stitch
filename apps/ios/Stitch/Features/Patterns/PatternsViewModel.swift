import Foundation

enum PatternsLayout: String, CaseIterable {
    case grid
    case list
    case largeList

    var icon: String {
        switch self {
        case .grid: return "square.grid.2x2"
        case .list: return "list.bullet"
        case .largeList: return "rectangle.grid.1x2"
        }
    }

    var label: String {
        switch self {
        case .grid: return "Grid"
        case .list: return "List"
        case .largeList: return "Large"
        }
    }

    var previewCount: Int {
        switch self {
        case .grid: return 6       // 2x3 grid
        case .list: return 8
        case .largeList: return 3
        }
    }
}

enum PatternsSort: String, CaseIterable {
    case newest
    case oldest
    case alphabetical
    case recentlyUpdated

    var label: String {
        switch self {
        case .newest: return "Newest first"
        case .oldest: return "Oldest first"
        case .alphabetical: return "A–Z"
        case .recentlyUpdated: return "Recently updated"
        }
    }

    var icon: String {
        switch self {
        case .newest: return "arrow.down"
        case .oldest: return "arrow.up"
        case .alphabetical: return "textformat.abc"
        case .recentlyUpdated: return "clock.arrow.circlepath"
        }
    }

    func sorted(_ patterns: [Pattern]) -> [Pattern] {
        switch self {
        case .newest:
            return patterns.sorted { ($0.createdAt ?? .distantPast) > ($1.createdAt ?? .distantPast) }
        case .oldest:
            return patterns.sorted { ($0.createdAt ?? .distantPast) < ($1.createdAt ?? .distantPast) }
        case .alphabetical:
            return patterns.sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
        case .recentlyUpdated:
            return patterns.sorted { ($0.updatedAt ?? .distantPast) > ($1.updatedAt ?? .distantPast) }
        }
    }
}

enum PatternFilter: String, CaseIterable, Identifiable {
    case all
    case hasPdf
    case aiParsed
    case fromRavelry
    case free

    var id: String { rawValue }

    var label: String {
        switch self {
        case .all: return "All"
        case .hasPdf: return "Has PDF"
        case .aiParsed: return "AI parsed"
        case .fromRavelry: return "From Ravelry"
        case .free: return "Free"
        }
    }

    var icon: String {
        switch self {
        case .all: return "tray.full"
        case .hasPdf: return "doc.fill"
        case .aiParsed: return "sparkles"
        case .fromRavelry: return "arrow.down.circle"
        case .free: return "gift"
        }
    }

    func matches(_ pattern: Pattern) -> Bool {
        switch self {
        case .all: return true
        case .hasPdf: return pattern.firstPdfUploadId != nil
        case .aiParsed: return pattern.aiParsed == true
        case .fromRavelry: return pattern.ravelryId != nil
        case .free: return pattern.sourceFree == true
        }
    }
}

@Observable
final class PatternsViewModel {
    var folders: [PatternFolder] = []
    var patterns: [Pattern] = []  // unfiled patterns (root level)
    var isLoading = false
    var error: String?
    var searchText = ""
    var activeFilter: PatternFilter = .all

    // Folder navigation
    var currentFolder: PatternFolder?
    var folderPatterns: [Pattern] = []
    var folderChildren: [PatternFolder] = []
    var isFolderLoading = false

    var filteredPatterns: [Pattern] {
        var result = patterns
        if activeFilter != .all {
            result = result.filter { activeFilter.matches($0) }
        }
        if !searchText.isEmpty {
            let query = searchText.lowercased()
            result = result.filter { pattern in
                pattern.title.lowercased().contains(query)
                || (pattern.designerName?.lowercased().contains(query) ?? false)
                || (pattern.yarnWeight?.lowercased().contains(query) ?? false)
                || (pattern.garmentType?.lowercased().contains(query) ?? false)
            }
        }
        return result
    }

    /// Counts for showing filter badges
    var filterCounts: [PatternFilter: Int] {
        var counts: [PatternFilter: Int] = [:]
        for filter in PatternFilter.allCases {
            counts[filter] = patterns.filter { filter.matches($0) }.count
        }
        return counts
    }

    // MARK: - Load root (folders + unfiled patterns)

    func loadRoot() async {
        isLoading = true
        defer { isLoading = false }
        do {
            async let foldersReq: APIResponse<[PatternFolder]> = APIClient.shared.get("/patterns/folders")
            async let patternsReq: APIResponse<PaginatedData<Pattern>> = APIClient.shared.get("/patterns?folder_id=root&limit=50")

            let (foldersRes, patternsRes) = try await (foldersReq, patternsReq)
            // Only show top-level folders
            folders = foldersRes.data.filter { $0.parentId == nil }
            patterns = patternsRes.data.items
        } catch is CancellationError {
            // Ignore — SwiftUI cancels tasks on view lifecycle changes
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Load folder contents

    func loadFolder(_ folder: PatternFolder) async {
        currentFolder = folder
        isFolderLoading = true
        defer { isFolderLoading = false }
        do {
            let response: APIResponse<PatternFolder> = try await APIClient.shared.get(
                "/patterns/folders/\(folder.id)"
            )
            folderChildren = response.data.children ?? []
            folderPatterns = response.data.patterns ?? []
        } catch is CancellationError {
            // Ignore
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Create folder

    func createFolder(name: String, parentId: String? = nil, color: String? = nil) async {
        struct Body: Encodable {
            let name: String
            let parent_id: String?
            let color: String?
        }
        do {
            let response: APIResponse<PatternFolder> = try await APIClient.shared.post(
                "/patterns/folders",
                body: Body(name: name, parent_id: parentId, color: color)
            )
            if parentId == nil {
                folders.append(response.data)
            } else {
                folderChildren.append(response.data)
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Rename folder

    func renameFolder(_ folder: PatternFolder, to name: String) async {
        do {
            let _: APIResponse<PatternFolder> = try await APIClient.shared.patch(
                "/patterns/folders/\(folder.id)",
                body: ["name": name]
            )
            if let idx = folders.firstIndex(where: { $0.id == folder.id }) {
                await loadRoot()
                _ = idx // reload is simpler than mutation for nested codable structs
            } else {
                if let cf = currentFolder {
                    await loadFolder(cf)
                }
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Delete folder

    func deleteFolder(_ folder: PatternFolder) async {
        // Optimistic: remove immediately
        let prevFolders = folders
        let prevChildren = folderChildren
        folders.removeAll { $0.id == folder.id }
        folderChildren.removeAll { $0.id == folder.id }

        struct Empty: Decodable {}
        do {
            let _: APIResponse<Empty> = try await APIClient.shared.delete(
                "/patterns/folders/\(folder.id)"
            )
            // Refresh to show unfiled patterns that were moved out
            await loadRoot()
        } catch {
            // Revert on failure
            folders = prevFolders
            folderChildren = prevChildren
            self.error = error.localizedDescription
        }
    }

    // MARK: - Move pattern to folder

    func movePattern(_ pattern: Pattern, toFolder folderId: String?) async {
        struct MoveBody: Encodable {
            let folder_id: String?
        }
        do {
            let _: APIResponse<Pattern> = try await APIClient.shared.patch(
                "/patterns/\(pattern.id)",
                body: MoveBody(folder_id: folderId)
            )
            // Refresh current view
            if let cf = currentFolder {
                await loadFolder(cf)
            } else {
                await loadRoot()
            }
        } catch {
            self.error = error.localizedDescription
        }
    }
}
