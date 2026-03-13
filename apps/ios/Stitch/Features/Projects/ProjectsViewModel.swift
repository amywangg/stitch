import Foundation
import SwiftUI

enum ProjectsLayout: String, CaseIterable {
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

    /// Max items to show before "See all" in collapsed state
    var previewCount: Int {
        switch self {
        case .grid: return 4       // 2x2 grid
        case .list: return 5
        case .largeList: return 2
        }
    }
}

enum ProjectsSort: String, CaseIterable {
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

    func sorted(_ projects: [Project]) -> [Project] {
        switch self {
        case .newest:
            return projects.sorted { $0.createdAt > $1.createdAt }
        case .oldest:
            return projects.sorted { $0.createdAt < $1.createdAt }
        case .alphabetical:
            return projects.sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
        case .recentlyUpdated:
            return projects.sorted { $0.updatedAt > $1.updatedAt }
        }
    }
}

@Observable
final class ProjectsViewModel {
    var inProgressProjects: [Project] = []
    var queueItems: [QueueItem] = []
    var completedProjects: [Project] = []
    var isLoading = false
    var error: String?

    func loadGrouped() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<GroupedProjects> = try await APIClient.shared.get("/projects/grouped")
            inProgressProjects = response.data.inProgress
            queueItems = response.data.queue
            completedProjects = response.data.completed
        } catch is CancellationError {
            // Ignore — SwiftUI cancels .refreshable tasks normally
        } catch {
            self.error = error.localizedDescription
        }
    }

    func syncRavelry() async {
        struct SyncResult: Decodable {
            let imported: Int?
            let updated: Int?
        }
        do {
            let _: APIResponse<SyncResult> = try await APIClient.shared.post("/integrations/ravelry/sync")
        } catch is CancellationError {
            // Ignore
        } catch {
            // Non-critical — don't surface sync errors on pull-to-refresh
        }
    }

    func createProject(title: String, craftType: String = "knitting") async {
        struct Body: Encodable { let title: String; let craftType: String }
        do {
            let response: APIResponse<Project> = try await APIClient.shared.post(
                "/projects",
                body: Body(title: title, craftType: craftType)
            )
            inProgressProjects.insert(response.data, at: 0)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deleteProject(_ project: Project) async {
        // Optimistic: remove immediately
        let prevInProgress = inProgressProjects
        let prevCompleted = completedProjects
        inProgressProjects.removeAll { $0.id == project.id }
        completedProjects.removeAll { $0.id == project.id }

        struct Empty: Decodable {}
        do {
            let _: Empty = try await APIClient.shared.delete("/projects/\(project.id)")
        } catch {
            // Revert on failure
            inProgressProjects = prevInProgress
            completedProjects = prevCompleted
            self.error = error.localizedDescription
        }
    }

    func removeQueueItem(_ item: QueueItem) async {
        // Optimistic: remove immediately
        let prevQueue = queueItems
        queueItems.removeAll { $0.id == item.id }

        struct Empty: Decodable {}
        do {
            let _: Empty = try await APIClient.shared.delete("/queue/\(item.id)")
        } catch {
            // Revert on failure
            queueItems = prevQueue
            self.error = error.localizedDescription
        }
    }
}
