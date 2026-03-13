import Foundation

@Observable
final class CounterViewModel {
    var currentRow: Int = 0
    var targetRows: Int?
    var sectionName: String = ""
    var isLoading = false
    var error: String?

    private var sectionId: String = ""

    func load(sectionId: String) async {
        self.sectionId = sectionId
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<CounterState> = try await APIClient.shared.get("/counter/\(sectionId)")
            currentRow = response.data.currentRow
            targetRows = response.data.targetRows
        } catch {
            self.error = error.localizedDescription
        }
    }

    func increment() async {
        currentRow += 1  // Optimistic update
        do {
            let response: APIResponse<CounterState> = try await APIClient.shared.post("/counter/\(sectionId)/increment")
            currentRow = response.data.currentRow
        } catch {
            currentRow -= 1  // Revert on failure
            self.error = error.localizedDescription
        }
    }

    func decrement() async {
        guard currentRow > 0 else { return }
        currentRow -= 1  // Optimistic update
        do {
            let response: APIResponse<CounterState> = try await APIClient.shared.post("/counter/\(sectionId)/decrement")
            currentRow = response.data.currentRow
        } catch {
            currentRow += 1  // Revert on failure
            self.error = error.localizedDescription
        }
    }

    func undo() async {
        do {
            let response: APIResponse<CounterState> = try await APIClient.shared.post("/counter/\(sectionId)/undo")
            currentRow = response.data.currentRow
        } catch {
            self.error = error.localizedDescription
        }
    }

    var progress: Double {
        guard let target = targetRows, target > 0 else { return 0 }
        return min(Double(currentRow) / Double(target), 1.0)
    }
}
