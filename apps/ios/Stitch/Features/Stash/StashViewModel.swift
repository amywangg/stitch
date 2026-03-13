import Foundation

@Observable
final class StashViewModel {
    var items: [StashItem] = []
    var isLoading = false
    var isSyncing = false
    var error: String?
    var syncMessage: String?

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<PaginatedData<StashItem>> = try await APIClient.shared.get("/stash")
            items = response.data.items
        } catch is CancellationError {
            // Ignore — SwiftUI cancels tasks on view lifecycle changes
        } catch {
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
            struct SyncResult: Decodable {
                let imported: Int
                let updated: Int
                let errors: [String]?
            }
            let response: APIResponse<SyncResult> = try await APIClient.shared.post(
                "/integrations/ravelry/sync/stash"
            )
            let result = response.data
            await load()

            if let errors = result.errors, !errors.isEmpty {
                syncMessage = "Synced with \(errors.count) error(s): \(errors.first ?? "")"
            } else if result.imported == 0 && result.updated == 0 {
                syncMessage = "Stash is up to date"
            } else {
                var parts: [String] = []
                if result.imported > 0 { parts.append("\(result.imported) imported") }
                if result.updated > 0 { parts.append("\(result.updated) updated") }
                syncMessage = parts.joined(separator: ", ")
            }
        } catch {
            self.error = error.localizedDescription
        }
    }
}
