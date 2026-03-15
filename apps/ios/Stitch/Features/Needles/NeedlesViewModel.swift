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

    func deleteSet(_ setId: String) async {
        do {
            struct Empty: Decodable {}
            let _: APIResponse<Empty> = try await APIClient.shared.delete("/needles/sets/\(setId)")
            needles.removeAll { $0.toolSetId == setId }
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

    // MARK: - Grouped Display

    struct NeedleGroup: Identifiable {
        let id: String
        let title: String
        let subtitle: String?
        let isSet: Bool
        let imageUrl: String?
        let items: [Needle]
    }

    /// Group needles: sets first (grouped by toolSetId), then loose needles by type
    var grouped: [NeedleGroup] {
        var setGroups: [String: [Needle]] = [:]
        var looseNeedles: [Needle] = []

        for needle in needles {
            if let setId = needle.toolSetId {
                setGroups[setId, default: []].append(needle)
            } else {
                looseNeedles.append(needle)
            }
        }

        var result: [NeedleGroup] = []

        // Sets first, sorted by brand + set name
        let sortedSets = setGroups.sorted { a, b in
            let nameA = a.value.first?.toolSetBrandName ?? ""
            let nameB = b.value.first?.toolSetBrandName ?? ""
            if nameA != nameB { return nameA < nameB }
            return (a.value.first?.toolSetName ?? "") < (b.value.first?.toolSetName ?? "")
        }

        for (setId, items) in sortedSets {
            let first = items.first
            let sorted = items.sorted { a, b in
                let typeOrder = needleTypeOrder(a.type) - needleTypeOrder(b.type)
                if typeOrder != 0 { return typeOrder < 0 }
                return a.sizeMm < b.sizeMm
            }
            result.append(NeedleGroup(
                id: setId,
                title: first?.toolSetName ?? "Set",
                subtitle: first?.toolSetBrandName,
                isSet: true,
                imageUrl: first?.toolSetImageUrl,
                items: sorted
            ))
        }

        // Loose needles grouped by type
        let typeDict = Dictionary(grouping: looseNeedles) { $0.type }
        let typeOrder = ["straight", "circular", "dpn", "crochet_hook", "interchangeable_tip", "interchangeable_cable"]
        for type in typeOrder {
            guard let items = typeDict[type], !items.isEmpty else { continue }
            result.append(NeedleGroup(
                id: type,
                title: formatNeedleType(type),
                subtitle: nil,
                isSet: false,
                imageUrl: nil,
                items: items.sorted { $0.sizeMm < $1.sizeMm }
            ))
        }

        // Any types not in the order list
        for (type, items) in typeDict where !typeOrder.contains(type) {
            result.append(NeedleGroup(
                id: type,
                title: type.capitalized,
                subtitle: nil,
                isSet: false,
                imageUrl: nil,
                items: items.sorted { $0.sizeMm < $1.sizeMm }
            ))
        }

        return result
    }

    private func needleTypeOrder(_ type: String) -> Int {
        switch type {
        case "interchangeable_tip": return 0
        case "interchangeable_cable": return 1
        case "circular": return 2
        case "straight": return 3
        case "dpn": return 4
        case "crochet_hook": return 5
        default: return 6
        }
    }

    private func formatNeedleType(_ type: String) -> String {
        switch type {
        case "straight": return "Straight needles"
        case "circular": return "Circular needles"
        case "dpn": return "Double-pointed needles"
        case "crochet_hook": return "Crochet hooks"
        case "interchangeable_tip": return "Interchangeable tips"
        case "interchangeable_cable": return "Interchangeable cables"
        default: return type.capitalized
        }
    }
}
