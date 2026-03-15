import Foundation

@Observable
final class GlossaryViewModel {
    var terms: [GlossaryTerm] = []
    var filteredTerms: [GlossaryTerm] = []
    var categories: [String] = []
    var selectedCategory: String? = nil
    var selectedCraft: String = "all"
    var searchText: String = "" {
        didSet { filter() }
    }
    var isLoading = false
    var error: String?

    private static let categoryOrder = [
        "decrease", "increase", "cast_on", "bind_off",
        "stitch_pattern", "construction", "shaping",
        "finishing", "crochet", "general",
    ]

    /// Maps the onboarding craft preference to a glossary filter value
    static var userCraftPreference: String {
        guard let pref = UserDefaults.standard.string(forKey: "stitch_craft_preference") else {
            return "all"
        }
        switch pref {
        case "knitting": return "knitting"
        case "crocheting": return "crochet"
        case "both": return "all"
        default: return "all"
        }
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }

        // Auto-set craft filter from user preference
        let pref = Self.userCraftPreference
        if selectedCraft == "all" && pref != "all" {
            selectedCraft = pref
        }

        // Use cache if available, otherwise fetch
        let cache = GlossaryCache.shared
        if cache.isLoaded {
            terms = cache.terms
            buildCategories()
            filter()
            // Always refresh in background to pick up new data
            Task {
                await cache.refresh()
                if !cache.terms.isEmpty {
                    terms = cache.terms
                    buildCategories()
                    filter()
                }
            }
            return
        }

        do {
            let response: APIResponse<PaginatedData<GlossaryTerm>> = try await APIClient.shared.get(
                "/glossary?page_size=500"
            )
            terms = response.data.items
            buildCategories()
            filter()
            // Also update cache
            await cache.refresh()
        } catch {
            self.error = error.localizedDescription
        }
    }

    func setCategory(_ category: String?) {
        selectedCategory = selectedCategory == category ? nil : category
        filter()
    }

    func setCraft(_ craft: String) {
        selectedCraft = craft
        // Save user's manual choice
        let prefValue: String
        switch craft {
        case "knitting": prefValue = "knitting"
        case "crochet": prefValue = "crocheting"
        default: prefValue = "both"
        }
        UserDefaults.standard.set(prefValue, forKey: "stitch_craft_preference")
        filter()
    }

    func filter() {
        var result = terms

        // Filter by craft type
        if selectedCraft != "all" {
            result = result.filter { $0.craftType == selectedCraft || $0.craftType == "both" }
        }

        // Filter by category
        if let category = selectedCategory {
            result = result.filter { $0.category == category }
        }

        // Filter by search text
        if !searchText.isEmpty {
            let query = searchText.lowercased()
            result = result.filter { term in
                term.name.lowercased().contains(query)
                || (term.abbreviation?.lowercased().contains(query) ?? false)
                || term.definition.lowercased().contains(query)
                || (term.synonyms?.contains { $0.synonym.lowercased().contains(query) } ?? false)
            }
        }

        filteredTerms = result
    }

    private func buildCategories() {
        let unique = Set(terms.map(\.category))
        categories = Self.categoryOrder.filter { unique.contains($0) }
    }

    // MARK: - Helpers

    static func categoryLabel(_ category: String) -> String {
        switch category {
        case "decrease": return "Decreases"
        case "increase": return "Increases"
        case "cast_on": return "Cast on"
        case "bind_off": return "Bind off"
        case "stitch_pattern": return "Stitch patterns"
        case "construction": return "Construction"
        case "shaping": return "Shaping"
        case "finishing": return "Finishing"
        case "crochet": return "Crochet"
        case "general": return "General"
        default: return category.capitalized
        }
    }

    static func categoryIcon(_ category: String) -> String {
        switch category {
        case "decrease": return "arrow.down.right.and.arrow.up.left"
        case "increase": return "arrow.up.left.and.arrow.down.right"
        case "cast_on": return "arrow.right.to.line"
        case "bind_off": return "arrow.left.to.line"
        case "stitch_pattern": return "square.grid.3x3"
        case "construction": return "building.2"
        case "shaping": return "ruler"
        case "finishing": return "checkmark.seal"
        case "crochet": return "lasso"
        case "general": return "book"
        default: return "questionmark"
        }
    }

    static func difficultyColor(_ difficulty: String) -> String {
        switch difficulty {
        case "beginner": return "#4ECDC4"
        case "intermediate": return "#FFB347"
        case "advanced": return "#FF6B6B"
        default: return "#999999"
        }
    }
}
