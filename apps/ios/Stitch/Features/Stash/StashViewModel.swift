import Foundation

enum StashStatusFilter: String, CaseIterable, Identifiable {
    case inStash = "in_stash"
    case usedUp = "used_up"
    case all = "all"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .inStash: return "In stash"
        case .usedUp: return "Used up"
        case .all: return "All"
        }
    }

    var queryParam: String? {
        switch self {
        case .inStash: return "in_stash"
        case .usedUp: return "used_up"
        case .all: return nil
        }
    }
}

@Observable
final class StashViewModel {
    var items: [StashItem] = []
    var isLoading = false
    var isSyncing = false
    var error: String?
    var syncMessage: String?
    var statusFilter: StashStatusFilter = .inStash

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            var path = "/stash"
            if let param = statusFilter.queryParam {
                path += "?status=\(param)"
            }
            let response: APIResponse<PaginatedData<StashItem>> = try await APIClient.shared.get(path)
            items = response.data.items
        } catch is CancellationError {
            // Ignore — SwiftUI cancels tasks on view lifecycle changes
        } catch {
            self.error = error.localizedDescription
        }
    }

    func updateStatus(_ item: StashItem, to newStatus: String) async {
        // Optimistic: remove from current filtered list if status changes filter match
        let previousItems = items
        if statusFilter != .all {
            items.removeAll { $0.id == item.id }
        }

        do {
            let body = ["status": newStatus]
            let _: APIResponse<StashItem> = try await APIClient.shared.patch(
                "/stash/\(item.id)", body: body
            )
            // If showing "all", reload to get updated status display
            if statusFilter == .all {
                await load()
            }
        } catch {
            items = previousItems
            self.error = error.localizedDescription
        }
    }

    func delete(_ item: StashItem) async {
        // Optimistic: remove immediately
        let previousItems = items
        items.removeAll { $0.id == item.id }

        do {
            struct Empty: Decodable {}
            let _: APIResponse<Empty> = try await APIClient.shared.delete("/stash/\(item.id)")
        } catch {
            // Revert on failure
            items = previousItems
            self.error = error.localizedDescription
        }
    }

    func syncRavelry() async {
        isSyncing = true
        syncMessage = nil
        defer { isSyncing = false }
        do {
            let message = try await RavelrySyncHelper.sync(
                endpoint: "/integrations/ravelry/sync/stash",
                entityName: "Stash"
            )
            await load()
            syncMessage = message
        } catch {
            self.error = error.localizedDescription
        }
    }
}
