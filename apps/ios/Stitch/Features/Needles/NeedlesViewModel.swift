import Foundation

@Observable
final class NeedlesViewModel {
    var needles: [Needle] = []
    var isLoading = false
    var isSyncing = false
    var error: String?
    var syncMessage: String?

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            struct NeedlesData: Decodable { let items: [Needle] }
            let response: APIResponse<NeedlesData> = try await APIClient.shared.get("/needles")
            needles = response.data.items
        } catch {
            self.error = error.localizedDescription
        }
    }

    func delete(_ needle: Needle) async {
        do {
            struct Empty: Decodable {}
            let _: APIResponse<Empty> = try await APIClient.shared.delete("/needles/\(needle.id)")
            needles.removeAll { $0.id == needle.id }
        } catch {
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
                let skipped: Int?
                let errors: [String]?
            }
            let response: APIResponse<SyncResult> = try await APIClient.shared.post(
                "/integrations/ravelry/sync/needles"
            )
            let result = response.data
            await load()

            if let errors = result.errors, !errors.isEmpty {
                syncMessage = "Synced with \(errors.count) error(s): \(errors.first ?? "")"
            } else if result.imported == 0 && result.updated == 0 {
                syncMessage = "Needles are up to date"
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

    /// Group needles by type for display
    var grouped: [(type: String, items: [Needle])] {
        let dict = Dictionary(grouping: needles) { $0.type }
        let order = ["straight", "circular", "dpn", "crochet_hook"]
        return order.compactMap { type in
            guard let items = dict[type], !items.isEmpty else { return nil }
            return (type: type, items: items)
        }
    }
}
