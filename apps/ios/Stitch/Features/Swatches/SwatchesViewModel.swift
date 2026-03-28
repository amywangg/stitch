import Foundation

@Observable
final class SwatchesViewModel {
    var swatches: [Swatch] = []
    var isLoading = false
    var error: String?

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<PaginatedData<Swatch>> = try await APIClient.shared.get(
                "/swatches?limit=50"
            )
            swatches = response.data.items
        } catch {
            self.error = error.localizedDescription
        }
    }

    func delete(_ id: String) async {
        swatches.removeAll { $0.id == id }
        do {
            struct Empty: Decodable {}
            let _: APIResponse<Empty> = try await APIClient.shared.delete("/swatches/\(id)")
        } catch {
            self.error = error.localizedDescription
            await load()
        }
    }
}
