import Foundation

@Observable
final class GlossaryCache {
    static let shared = GlossaryCache()

    private(set) var terms: [GlossaryTerm] = []
    private(set) var isLoaded = false

    private let cacheKey = "stitch_glossary_cache"
    private let cacheTimestampKey = "stitch_glossary_cache_ts"

    // Lookup indexes
    private var byAbbreviation: [String: GlossaryTerm] = [:]
    private var bySlug: [String: GlossaryTerm] = [:]
    private var bySynonym: [String: GlossaryTerm] = [:]
    private var byName: [String: GlossaryTerm] = [:]
    private var abbreviationSet: Set<String> = []

    private init() {
        loadFromDisk()
    }

    // MARK: - Public API

    func lookup(abbreviation: String) -> GlossaryTerm? {
        let lower = abbreviation.lowercased()
        return byAbbreviation[abbreviation.uppercased()] ?? bySynonym[lower] ?? byName[lower]
    }

    func lookup(slug: String) -> GlossaryTerm? {
        bySlug[slug]
    }

    func lookup(slugs: [String]) -> [GlossaryTerm] {
        slugs.compactMap { bySlug[$0] }
    }

    func allAbbreviations() -> Set<String> {
        abbreviationSet
    }

    /// Refresh from API in background. Serves cached data immediately.
    func refreshIfNeeded() async {
        // Refresh if cache is older than 1 hour or empty
        let lastRefresh = UserDefaults.standard.double(forKey: cacheTimestampKey)
        let hourAgo = Date().timeIntervalSince1970 - 3600

        if isLoaded && lastRefresh > hourAgo {
            return
        }

        await refresh()
    }

    /// Clear local cache to force fresh fetch on next load
    func clearCache() {
        UserDefaults.standard.removeObject(forKey: cacheKey)
        UserDefaults.standard.removeObject(forKey: cacheTimestampKey)
        terms = []
        isLoaded = false
        byAbbreviation = [:]
        bySlug = [:]
        bySynonym = [:]
        byName = [:]
        abbreviationSet = []
    }

    func refresh() async {
        do {
            let response: APIResponse<PaginatedData<GlossaryTerm>> = try await APIClient.shared.get(
                "/glossary?page_size=500"
            )
            let fetched = response.data.items
            terms = fetched
            buildIndexes()
            isLoaded = true
            saveToDisk(fetched)
        } catch {
            // If network fails but we have cached data, that's fine
            if !isLoaded {
                isLoaded = terms.isEmpty == false
            }
        }
    }

    // MARK: - Persistence

    private func loadFromDisk() {
        guard let data = UserDefaults.standard.data(forKey: cacheKey) else { return }
        do {
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            let cached = try decoder.decode([GlossaryTerm].self, from: data)
            terms = cached
            buildIndexes()
            isLoaded = !cached.isEmpty
        } catch {
            // Corrupted cache — will refresh from API
        }
    }

    private func saveToDisk(_ items: [GlossaryTerm]) {
        do {
            let encoder = JSONEncoder()
            encoder.keyEncodingStrategy = .convertToSnakeCase
            let data = try encoder.encode(items)
            UserDefaults.standard.set(data, forKey: cacheKey)
            UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: cacheTimestampKey)
        } catch {
            // Non-critical — cache will be rebuilt next launch
        }
    }

    // MARK: - Indexing

    private func buildIndexes() {
        var abbrevMap: [String: GlossaryTerm] = [:]
        var slugMap: [String: GlossaryTerm] = [:]
        var synMap: [String: GlossaryTerm] = [:]
        var nameMap: [String: GlossaryTerm] = [:]
        var searchableSet: Set<String> = []

        for term in terms {
            slugMap[term.slug] = term

            // Index by abbreviation (e.g. "K", "SSK", "RS")
            if let abbrev = term.abbreviation {
                abbrevMap[abbrev.uppercased()] = term
                searchableSet.insert(abbrev)
            }

            // Index by name (e.g. "Knit Stitch", "Turn", "Gauge")
            nameMap[term.name.lowercased()] = term
            searchableSet.insert(term.name)

            // Index by all synonyms (e.g. "Knit", "Purl", "plain stitch")
            if let synonyms = term.synonyms {
                for syn in synonyms {
                    synMap[syn.synonym.lowercased()] = term
                    searchableSet.insert(syn.synonym)
                }
            }
        }

        byAbbreviation = abbrevMap
        bySlug = slugMap
        bySynonym = synMap
        byName = nameMap
        abbreviationSet = searchableSet
    }
}
