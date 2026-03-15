import Foundation

// MARK: - Tutorial List ViewModel

@Observable
final class TutorialListViewModel {
    var tutorials: [Tutorial] = []
    var filteredTutorials: [Tutorial] = []
    var selectedCraft: String = "all"
    var selectedCategory: String? = nil
    var isLoading = false
    var error: String?

    private static let categoryOrder = [
        "cast_on", "bind_off", "stitches", "techniques",
        "finishing", "crochet_basics", "reading_patterns",
    ]

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<PaginatedData<Tutorial>> = try await APIClient.shared.get(
                "/tutorials?page_size=50"
            )
            tutorials = response.data.items
            filter()
        } catch {
            self.error = error.localizedDescription
        }
    }

    func setCraft(_ craft: String) {
        selectedCraft = craft
        filter()
    }

    func setCategory(_ category: String?) {
        selectedCategory = selectedCategory == category ? nil : category
        filter()
    }

    func filter() {
        var result = tutorials

        if selectedCraft != "all" {
            result = result.filter { $0.craftType == selectedCraft || $0.craftType == "both" }
        }

        if let category = selectedCategory {
            result = result.filter { $0.category == category }
        }

        filteredTutorials = result
    }

    var categories: [String] {
        let unique = Set(tutorials.map(\.category))
        return Self.categoryOrder.filter { unique.contains($0) }
    }

    static func categoryLabel(_ category: String) -> String {
        switch category {
        case "cast_on": return "Cast on"
        case "bind_off": return "Bind off"
        case "stitches": return "Stitches"
        case "techniques": return "Techniques"
        case "finishing": return "Finishing"
        case "crochet_basics": return "Crochet basics"
        case "reading_patterns": return "Reading patterns"
        default: return category.capitalized
        }
    }
}

// MARK: - Tutorial Detail ViewModel

@Observable
final class TutorialDetailViewModel {
    var tutorial: Tutorial?
    var completedSteps: Set<Int> = []
    var isLoading = false
    var error: String?

    func load(tutorialId: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<Tutorial> = try await APIClient.shared.get(
                "/tutorials/\(tutorialId)"
            )
            tutorial = response.data
        } catch {
            self.error = error.localizedDescription
        }
    }

    func toggleStep(_ stepNumber: Int) {
        if completedSteps.contains(stepNumber) {
            completedSteps.remove(stepNumber)
        } else {
            completedSteps.insert(stepNumber)
        }
        syncProgress()
    }

    func markAllComplete() {
        guard let steps = tutorial?.steps else { return }
        completedSteps = Set(steps.map(\.stepNumber))
        syncProgress()
    }

    var completionPct: Double {
        guard let steps = tutorial?.steps, !steps.isEmpty else { return 0 }
        return Double(completedSteps.count) / Double(steps.count)
    }

    private func syncProgress() {
        guard let tutorial else { return }
        let lastStep = completedSteps.max() ?? 0
        let isComplete = tutorial.steps.map { completedSteps.count == $0.count } ?? false

        Task {
            do {
                struct Body: Encodable {
                    let last_step: Int
                    let completed: Bool
                }
                let _: APIResponse<TutorialProgress> = try await APIClient.shared.post(
                    "/tutorials/\(tutorial.id)/progress",
                    body: Body(last_step: lastStep, completed: isComplete)
                )
            } catch {
                // Non-critical — progress will sync on next open
            }
        }
    }
}
