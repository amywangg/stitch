import Foundation

// MARK: - API Response Wrappers

struct APIResponse<T: Decodable>: Decodable {
    let success: Bool
    let data: T
}

struct PaginatedData<T: Decodable>: Decodable {
    let items: [T]
    let total: Int
    let page: Int
    let pageSize: Int
    let hasMore: Bool
}

// MARK: - User

struct User: Codable, Identifiable {
    let id: String
    let clerkId: String
    let email: String
    let username: String
    let displayName: String?
    let avatarUrl: String?
    let bio: String?
    let isPro: Bool
    let createdAt: Date
    let updatedAt: Date
}

// MARK: - Ravelry

struct RavelryConnection: Codable {
    let ravelryUsername: String?
    let syncedAt: Date?
    let importStatus: String?
    let importStats: ImportStats?
    let importError: String?
    let syncToRavelry: Bool
    let connected: Bool
    let tokenValid: Bool?

    struct ImportStats: Codable {
        let currentPhase: String?
        let profile: ProfileStats?
        let projects: CountStats?
        let patterns: PatternStats?
        let queue: CountStats?
        let stash: CountStats?
        let needles: CountStats?
        let pushBack: PushBackStats?

        struct ProfileStats: Codable { let updated: Bool? }
        struct CountStats: Codable {
            let imported: Int?
            let updated: Int?
            let total: Int?
        }
        struct PatternStats: Codable {
            let imported: Int?
            let updated: Int?
            let total: Int?
            let pdfsDownloaded: Int?
        }
        struct PushBackStats: Codable {
            let projectsCreated: Int?
            let projectsUpdated: Int?
            let photosUploaded: Int?
            let errors: Int?
        }
    }
}

// MARK: - Project

struct Project: Codable, Identifiable {
    let id: String
    let userId: String
    let slug: String
    var title: String
    var description: String?
    var status: String
    var craftType: String
    var sizeMade: String?
    var modsNotes: String?
    let category: String?
    let ravelryId: String?
    let ravelryPermalink: String?
    var pdfUploadId: String?
    var progressPct: Int?
    var startedAt: Date?
    var finishedAt: Date?
    let deletedAt: Date?
    let createdAt: Date
    let updatedAt: Date
    var sections: [ProjectSection]?
    var photos: [ProjectPhoto]?
    var yarns: [ProjectYarn]?
    var needles: [ProjectNeedle]?
    var gauge: ProjectGauge?
    var pdfUpload: PdfUpload?
    var tags: [ProjectTag]?
    var pattern: PatternRef?
    var patternId: String?

    /// Best available cover image URL with fallback chain:
    /// 1. User's own project photos (highest priority)
    /// 2. Linked pattern's cover image
    var coverImageUrl: String? {
        if let userPhoto = photos?.first?.url {
            return userPhoto
        }
        if let patternCover = pattern?.coverImageUrl {
            return patternCover
        }
        return nil
    }
}

struct PatternRef: Codable {
    let id: String
    let title: String
    let designerName: String?
    let coverImageUrl: String?
    let craftType: String?
    let difficulty: String?
    let yarnWeight: String?
    let gaugeStitchesPer10cm: Double?
    let gaugeRowsPer10cm: Double?
    let needleSizeMm: Double?
    let sizesAvailable: String?
    let sourceUrl: String?
    let aiParsed: Bool?
    let sizes: [PatternSize]?
}

struct ProjectTag: Codable, Identifiable {
    var id: String { tag.id }
    let projectId: String
    let tagId: String
    let tag: Tag

    struct Tag: Codable {
        let id: String
        let name: String
    }
}

struct ProjectSection: Codable, Identifiable {
    let id: String
    let projectId: String
    let name: String
    let description: String?
    var targetRows: Int?
    var currentRow: Int
    let currentStep: Int?
    let completed: Bool?
    let patternSectionId: String?
    let sortOrder: Int
    let patternSection: PatternSection?
}

struct ProjectPhoto: Codable, Identifiable {
    let id: String
    let projectId: String
    let url: String
    let caption: String?
    let sortOrder: Int
}

struct YarnDetail: Codable {
    let id: String
    let name: String
    let weight: String?
    let company: YarnCompany?
}

struct YarnCompany: Codable {
    let id: String
    let name: String
}

struct ProjectYarn: Codable, Identifiable {
    let id: String
    let projectId: String
    let nameOverride: String?
    let colorway: String?
    let skeinsUsed: Double?
    let stashItemId: String?
    let yarn: YarnDetail?
    let stashItem: StashItemRef?

    /// Display name: yarn company + name, or name override fallback
    var displayName: String {
        if let company = yarn?.company?.name, let name = yarn?.name {
            return "\(company) \(name)"
        }
        return yarn?.name ?? nameOverride ?? "Unknown yarn"
    }

    struct StashItemRef: Codable {
        let id: String
        let colorway: String?
        let skeins: Double?
        let photoUrl: String?
    }
}

struct ProjectNeedle: Codable, Identifiable {
    let id: String
    let projectId: String
    let needleId: String?
    let type: String
    let sizeMm: Double
    let sizeLabel: String?
    let lengthCm: Int?
    let material: String?
    let brand: String?
    let notes: String?
    let needle: Needle?

    /// Human-readable label: "4.5mm circular, 80cm"
    var displayLabel: String {
        let typeLabel = type.replacingOccurrences(of: "_", with: " ").capitalized
        var parts = ["\(String(format: sizeMm.truncatingRemainder(dividingBy: 1) == 0 ? "%.0f" : "%.2g", sizeMm))mm \(typeLabel)"]
        if let cm = lengthCm { parts.append("\(cm)cm") }
        return parts.joined(separator: ", ")
    }
}

struct ProjectGauge: Codable {
    let id: String
    let projectId: String
    let stitchesPer10cm: Double?
    let rowsPer10cm: Double?
    let needleSizeMm: Double?
    let yarnWeight: String?
}

struct GaugeEstimate: Codable {
    let effectiveWeight: String
    let effectiveWeightLabel: String
    let totalThicknessScore: Int
    let stitchesPer10cm: GaugeRange
    let rowsPer10cm: GaugeRange
    let needleSizeMm: GaugeRange

    struct GaugeRange: Codable {
        let min: Double
        let max: Double
        let midpoint: Double
    }
}

// MARK: - Grouped Projects

struct GroupedProjects: Codable {
    let inProgress: [Project]
    let queue: [QueueItem]
    let completed: [Project]
}

// MARK: - Pattern Folder

struct PatternFolder: Codable, Identifiable {
    let id: String
    let parentId: String?
    let name: String
    let color: String?
    let sortOrder: Int
    let createdAt: Date
    let updatedAt: Date
    var count: PatternFolderCount?
    var children: [PatternFolder]?
    var patterns: [Pattern]?

    struct PatternFolderCount: Codable {
        let patterns: Int
    }

    enum CodingKeys: String, CodingKey {
        case id, parentId, name, color, sortOrder, createdAt, updatedAt, children, patterns, count
    }
}

// MARK: - Pattern

struct Pattern: Codable, Identifiable, Hashable {
    let id: String
    let userId: String?
    let folderId: String?
    let slug: String?
    let title: String
    let description: String?
    let craftType: String?
    let difficulty: String?
    let garmentType: String?
    let designerName: String?
    let sourceUrl: String?
    let pdfUrl: String?
    let coverImageUrl: String?
    var isPublic: Bool?
    let sourceFree: Bool?
    let ravelryId: String?
    let aiParsed: Bool?
    let needleSizeMm: Double?
    let needleSizes: [String]?
    let sizesAvailable: String?
    let gaugeStitchesPer10cm: Double?
    let gaugeRowsPer10cm: Double?
    let gaugeStitchPattern: String?
    let yarnWeight: String?
    let selectedSize: String?
    let rating: Double?
    let ratingCount: Int?
    let notesHtml: String?
    let createdAt: Date?
    let updatedAt: Date?
    let yardageMin: Int?
    let yardageMax: Int?
    let priceCents: Int?
    let currency: String?
    let isMarketplace: Bool?
    let salesCount: Int?
    let isQueued: Bool?
    let folder: PatternFolderRef?
    let sections: [PatternSection]?
    let sizes: [PatternSize]?
    let photos: [PatternPhoto]?
    let patternYarns: [PatternYarn]?
    let pdfUploads: [PdfUpload]?

    var firstPdfUploadId: String? { pdfUploads?.first?.id }

    /// All carousel image URLs: photos array if available, otherwise fallback to cover image
    var allPhotoUrls: [String] {
        if let photos, !photos.isEmpty {
            return photos.map(\.url)
        }
        if let coverImageUrl {
            return [coverImageUrl]
        }
        return []
    }

    static func == (lhs: Pattern, rhs: Pattern) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

struct PatternYarn: Codable, Identifiable, Hashable {
    let id: String
    let patternId: String
    var name: String
    var weight: String?
    var colorway: String?
    var fiberContent: String?
    var strands: Int
    let sortOrder: Int
    let yarn: YarnDetail?

    static func == (lhs: PatternYarn, rhs: PatternYarn) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

struct PatternPhoto: Codable, Identifiable, Hashable {
    let id: String
    let patternId: String
    let url: String
    let sortOrder: Int
    let caption: String?

    static func == (lhs: PatternPhoto, rhs: PatternPhoto) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

// MARK: - Pattern Section

struct PatternSection: Codable, Identifiable, Hashable {
    let id: String
    let patternId: String
    let name: String
    let content: String?
    let sortOrder: Int
    let rows: [PatternInstruction]?

    static func == (lhs: PatternSection, rhs: PatternSection) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

struct PatternInstruction: Codable, Identifiable, Hashable {
    let id: String
    let sectionId: String
    let rowNumber: Int
    let instruction: String
    let notes: String?
    let stitchCount: Int?
    let rowType: String?
    let rowsInStep: Int?
    let isRepeat: Bool?
    let repeatCount: Int?
    let rowsPerRepeat: Int?
    let targetMeasurementCm: Double?

    static func == (lhs: PatternInstruction, rhs: PatternInstruction) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

struct PatternSize: Codable, Identifiable, Hashable {
    let id: String
    let patternId: String
    let name: String
    let sortOrder: Int
    let finishedBustCm: Double?
    let finishedLengthCm: Double?
    let yardage: Int?

    static func == (lhs: PatternSize, rhs: PatternSize) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

struct PatternFolderRef: Codable {
    let id: String
    let name: String
    let color: String?
}

// MARK: - Community Pattern

struct CommunityPattern: Codable, Identifiable {
    let id: String
    let title: String
    let designerName: String?
    let craftType: String
    let garmentType: String?
    let difficulty: String?
    let yarnWeight: String?
    let coverImageUrl: String?
    let rating: Double?
    let ratingCount: Int?
    let createdAt: Date
    let author: CommunityPatternAuthor
}

struct CommunityPatternAuthor: Codable {
    let username: String
    let displayName: String?
    let avatarUrl: String?
}

struct CommunityPatternDetail: Codable {
    let id: String
    let title: String
    let description: String?
    let designerName: String?
    let craftType: String
    let garmentType: String?
    let difficulty: String?
    let yarnWeight: String?
    let coverImageUrl: String?
    let sizesAvailable: String?
    let needleSizes: [String]?
    let gaugeStitchesPer10cm: Double?
    let gaugeRowsPer10cm: Double?
    let gaugeStitchPattern: String?
    let needleSizeMm: Double?
    let yardageMin: Int?
    let yardageMax: Int?
    let rating: Double?
    let ratingCount: Int?
    let sourceUrl: String?
    let createdAt: Date
    let author: CommunityPatternAuthor
}

// MARK: - Social

struct UserSummary: Codable, Identifiable {
    let id: String
    let username: String
    let displayName: String?
    let avatarUrl: String?
    let bio: String?
    var isFollowing: Bool?
}

struct Post: Codable, Identifiable {
    let id: String
    let userId: String
    let content: String
    let imageUrl: String?
    let projectId: String?
    let createdAt: Date
    let updatedAt: Date
    let user: PostAuthor
    let photos: [PostPhoto]?
    var isLiked: Bool?
    let count: PostCounts?

    enum CodingKeys: String, CodingKey {
        case id, userId, content, imageUrl, projectId, createdAt, updatedAt, user, photos, isLiked
        case count = "_count"
    }
}

struct PostAuthor: Codable {
    let id: String
    let username: String
    let displayName: String?
    let avatarUrl: String?
}

struct PostPhoto: Codable, Identifiable {
    let id: String
    let url: String
    let sortOrder: Int
}

struct PostCounts: Codable {
    let likes: Int?
    let comments: Int?
}

// MARK: - Feed

enum FeedItemKind: String, Codable {
    case post
    case activity
}

struct FeedItem: Codable, Identifiable {
    let kind: FeedItemKind
    let id: String
    let createdAt: Date
    let post: FeedPost?
    let activity: FeedActivity?
}

struct FeedPost: Codable {
    let id: String
    let userId: String
    let content: String
    let createdAt: Date
    let user: PostAuthor
    let photos: [PostPhoto]?
    let project: PostLinkedProject?
    let pattern: PostLinkedPattern?
    let yarns: [PostYarn]?
    let sessionMinutes: Int?
    let sessionRows: Int?
    var isLiked: Bool
    let count: PostCounts?

    enum CodingKeys: String, CodingKey {
        case id, userId, content, createdAt, user, photos, project, pattern, yarns
        case sessionMinutes, sessionRows, isLiked
        case count = "_count"
    }
}

struct PostLinkedProject: Codable, Identifiable {
    let id: String
    let title: String
    let slug: String?
}

struct PostLinkedPattern: Codable, Identifiable {
    let id: String
    let title: String
    let slug: String?
    let coverImageUrl: String?
}

struct PostYarn: Codable, Identifiable {
    let id: String
    let yarnName: String
    let colorway: String?
    let weight: String?
}

struct FeedActivity: Codable {
    let id: String
    let userId: String
    let type: String
    let createdAt: Date
    let metadata: [String: AnyCodableValue]?
    let user: PostAuthor
    let project: ActivityProject?
    let pattern: ActivityPattern?
    var isLiked: Bool
    let count: PostCounts?

    enum CodingKeys: String, CodingKey {
        case id, userId, type, createdAt, metadata, user, project, pattern, isLiked
        case count = "_count"
    }
}

struct ActivityProject: Codable {
    let id: String
    let title: String
    let slug: String
    let status: String
    let craftType: String
    let photos: [ProjectPhoto]?
}

struct ActivityPattern: Codable {
    let id: String
    let title: String
    let slug: String
    let coverImageUrl: String?
    let designerName: String?
}

// Flexible JSON value for metadata
enum AnyCodableValue: Codable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let intVal = try? container.decode(Int.self) {
            self = .int(intVal)
        } else if let doubleVal = try? container.decode(Double.self) {
            self = .double(doubleVal)
        } else if let boolVal = try? container.decode(Bool.self) {
            self = .bool(boolVal)
        } else if let stringVal = try? container.decode(String.self) {
            self = .string(stringVal)
        } else {
            self = .string("")
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let v): try container.encode(v)
        case .int(let v): try container.encode(v)
        case .double(let v): try container.encode(v)
        case .bool(let v): try container.encode(v)
        }
    }

    var stringValue: String {
        switch self {
        case .string(let v): return v
        case .int(let v): return String(v)
        case .double(let v): return String(v)
        case .bool(let v): return String(v)
        }
    }

    var intValue: Int? {
        switch self {
        case .int(let v): return v
        case .double(let v): return Int(v)
        case .string(let v): return Int(v)
        case .bool: return nil
        }
    }
}

// MARK: - Ravelry Friends

struct RavelryFriendMatch: Codable {
    let user: UserSummary
    let isFollowing: Bool
    let ravelryUsername: String
}

struct RavelryFriendNotOnStitch: Codable {
    let ravelryUsername: String
    let photoUrl: String?
}

struct RavelryFriendsResponse: Codable {
    let onStitch: [RavelryFriendMatch]
    let notOnStitch: [RavelryFriendNotOnStitch]
}

// MARK: - Notifications

struct StitchNotification: Codable, Identifiable {
    let id: String
    let userId: String
    let senderId: String?
    let type: String
    let resourceType: String?
    let resourceId: String?
    let message: String?
    let read: Bool
    let createdAt: Date
    let sender: PostAuthor?
}

struct NotificationsResponse: Codable {
    let items: [StitchNotification]
    let total: Int
    let unreadCount: Int
    let page: Int
    let pageSize: Int
    let hasMore: Bool
}

// MARK: - Comment

struct Comment: Codable, Identifiable {
    let id: String
    let userId: String
    let content: String
    let createdAt: Date
    let user: PostAuthor
}

// MARK: - Subscription

struct Subscription: Codable {
    let plan: String
    let status: String
    let expiresAt: Date?
}

// MARK: - Stash

struct StashItem: Identifiable, Codable {
    let id: String
    let yarnId: String
    let colorway: String?
    let skeins: Double
    let grams: Int?
    let notes: String?
    let status: String?
    let photoUrl: String?
    let ravelryId: String?
    var yarn: YarnSummary?
    var projects: [StashLinkedProject]?

    struct YarnSummary: Codable {
        let id: String
        let name: String
        let weight: String?
        let imageUrl: String?
        let fiberContent: String?
        let yardagePerSkein: Int?
        let gramsPerSkein: Int?
        var company: CompanySummary?
        struct CompanySummary: Codable { let name: String }
    }
}

struct ColorwayIdentification: Codable {
    let colorway: String
    let confidence: String
    let notes: String?
}

struct StashLinkedProject: Codable, Identifiable {
    let id: String
    let title: String
    let status: String
    let slug: String
    let photos: [ProjectPhoto]?
}

// MARK: - Queue

struct QueueItem: Identifiable, Codable {
    let id: String
    let patternId: String
    let pdfUploadId: String?
    let notes: String?
    let sortOrder: Int
    let ravelryQueueId: String?
    var pattern: Pattern?
    var pdfUpload: PdfUpload?

}

// MARK: - Needles

struct Needle: Identifiable, Codable {
    let id: String
    let type: String       // "straight" | "circular" | "dpn" | "crochet_hook" | "interchangeable_tip" | "interchangeable_cable"
    let sizeMm: Double
    let sizeLabel: String?
    let lengthCm: Int?
    let material: String?
    let brand: String?
    let notes: String?
    let toolSetId: String?
    let toolSetName: String?
    let toolSetType: String?
    let toolSetBrandName: String?
    let toolSetImageUrl: String?
    let ravelryId: String?
}

// MARK: - Swatches

struct Swatch: Codable, Identifiable {
    let id: String
    let userId: String
    let slug: String
    var title: String
    var notes: String?
    var isPublic: Bool
    var craftType: String
    var stitchPattern: String?
    var stitchesPer10cm: Double?
    var rowsPer10cm: Double?
    var needleSizeMm: Double?
    var needleSizeLabel: String?
    var needleType: String?
    var washed: Bool
    var blocked: Bool
    var widthCm: Double?
    var heightCm: Double?
    var photoUrl: String?
    let createdAt: Date
    let updatedAt: Date
    var yarns: [SwatchYarn]?
    var user: SwatchAuthor?
}

struct SwatchYarn: Codable, Identifiable {
    let id: String
    let nameOverride: String?
    let colorway: String?
    let strands: Int
    let yarn: YarnDetail?

    var displayName: String {
        if let company = yarn?.company?.name, let name = yarn?.name {
            return "\(company) \(name)"
        }
        return yarn?.name ?? nameOverride ?? "Unknown yarn"
    }
}

struct SwatchAuthor: Codable {
    let id: String
    let username: String
    let displayName: String?
    let avatarUrl: String?
}

// MARK: - Tool Catalog

struct ToolBrand: Codable, Identifiable {
    let id: String
    let name: String
    let website: String?
    let logoUrl: String?
    let count: ToolBrandCount?

    enum CodingKeys: String, CodingKey {
        case id, name, website, logoUrl
        case count = "_count"
    }

    struct ToolBrandCount: Codable {
        let toolSets: Int
    }
}

struct ToolSet: Codable, Identifiable {
    let id: String
    let brandId: String
    let name: String
    let setType: String
    let description: String?
    let imageUrl: String?
    let source: String?
    let brand: ToolBrand?
    let items: [ToolSetItem]?
}

struct ToolSetItem: Codable, Identifiable {
    let id: String
    let type: String
    let sizeMm: Double
    let sizeLabel: String?
    let lengthCm: Int?
    let material: String?
    let quantity: Int
    let sortOrder: Int
}

struct AddSetResult: Codable {
    let added: Int
    let setName: String
}

// MARK: - Tool Product Lines (individual needles/hooks catalog)

struct ToolProductLine: Codable, Identifiable {
    let id: String
    let brandId: String
    let name: String
    let type: String // circular, straight, dpn, crochet_hook
    let material: String?
    let sizes: [ProductLineSize]?
    let lengthsCm: [Int]?
    let imageUrl: String?
    let brand: ToolProductLineBrand?

    struct ToolProductLineBrand: Codable {
        let id: String
        let name: String
        let logoUrl: String?
    }
}

struct ProductLineSize: Codable, Hashable {
    let mm: Double
    let label: String
}

// MARK: - Supplies

struct Supply: Codable, Identifiable {
    let id: String
    let name: String
    let category: String
    let brand: String?
    let quantity: Int
    let notes: String?
    let photoUrl: String?
    let createdAt: Date?
}

// MARK: - Yarn Search (Ravelry)

struct YarnSearchResult: Codable, Identifiable, Hashable {
    var id: Int { ravelryId }
    let ravelryId: Int
    let name: String
    let permalink: String?
    let companyName: String?
    let companyId: Int?
    let discontinued: Bool?
    let machineWashable: Bool?
    let grams: Int?
    let yardage: Int?
    let weight: String?
    let weightPly: String?
    let texture: String?
    let wpi: Int?
    let minGauge: Double?
    let maxGauge: Double?
    let gaugeDivisor: Int?
    let knitGauge: String?
    let rating: Double?
    let ratingCount: Int?
    let photoUrl: String?
    let fibers: [YarnFiber]?

    struct YarnFiber: Codable, Hashable {
        let name: String
        let percentage: Int
    }

    static func == (lhs: YarnSearchResult, rhs: YarnSearchResult) -> Bool {
        lhs.ravelryId == rhs.ravelryId
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(ravelryId)
    }
}

struct YarnSearchResponse: Codable {
    let yarns: [YarnSearchResult]
    let paginator: YarnPaginator

    struct YarnPaginator: Codable {
        let results: Int
        let page: Int
        let pageCount: Int
        let pageSize: Int
    }
}

// MARK: - Counter

struct CounterState: Codable {
    let sectionId: String
    let currentRow: Int
    let targetRows: Int?
}

struct CounterResponse: Codable {
    let sectionId: String
    let currentRow: Int
    let currentStep: Int?
    let previousRow: Int?
    let instruction: InstructionData?
}

struct InstructionData: Codable {
    let stepNumber: Int
    let instruction: String
    let stitchCount: Int?
    let rowType: String?
    let isRepeat: Bool?
    let isOpenEnded: Bool?
    let position: StepPosition?
    let progress: SectionProgress?
    let autoAdvanced: Bool?
    let sectionCompleted: Bool?
}

struct StepPosition: Codable {
    let stepNumber: Int
    let tapInStep: Int
    let totalTapsInStep: Int?
    let stepLabel: String?
}

struct SectionProgress: Codable {
    let currentStep: Int
    let totalSteps: Int
    let stepsCompleted: Int?
    let stepPct: Int?
    let overallPct: Int?
}

struct InstructionDetailResponse: Codable {
    let sectionName: String
    let sectionCompleted: Bool
    let step: StepDetail
    let position: StepPosition
    let progress: SectionProgress
    let userNotes: [StepNote]?
    let context: InstructionContext?
}

struct StepDetail: Codable {
    let stepNumber: Int
    let instruction: String
    let hasOverride: Bool?
    let originalInstruction: String?
    let stitchCount: Int?
    let rowType: String?
    let notes: String?
    let isOpenEnded: Bool?
    let targetMeasurementCm: Double?
    let isRepeat: Bool?
    let repeatCount: Int?
    let rowsPerRepeat: Int?
}

struct StepNote: Codable, Identifiable {
    let id: String
    let stepNumber: Int
    let content: String
    let noteType: String
    let createdAt: Date
}

struct InstructionContext: Codable {
    let previous: ContextStep?
    let next: ContextStep?
}

struct ContextStep: Codable {
    let stepNumber: Int
    let instruction: String
    let rowType: String?
}

// MARK: - PDF Upload

struct PdfUpload: Codable, Identifiable {
    let id: String
    let userId: String?
    let patternId: String?
    let fileName: String?
    let fileSize: Int?
    let status: String?
    let storagePath: String?
    let error: String?
    let createdAt: Date?
}

struct PdfSignedUrl: Codable {
    let id: String
    let fileName: String
    let fileSize: Int
    let status: String
    let url: String
    let expiresIn: Int
}

// MARK: - PDF Parse Flow

struct RavelryMatchCandidate: Codable, Identifiable {
    var id: Int { ravelryId }
    let ravelryId: Int
    let name: String
    let permalink: String
    let craft: String?
    let weight: String?
    let designer: String?
    let photoUrl: String?
    let free: Bool
    let difficulty: Double?
    let rating: Double?
}

struct ParseResponse: Codable {
    let pattern: Pattern
    let meta: ParseMeta
    let ravelryMatches: [RavelryMatchCandidate]?
    let nextStep: String?

    struct ParseMeta: Codable {
        let pageCount: Int
        let parsedTitle: String?
        let parsedDesigner: String?
    }
}

struct SizeRecommendation: Codable, Identifiable {
    var id: String { name }
    let name: String
    let sortOrder: Int
    let easeCm: Double?
    let fit: String?
    let recommendation: String?
    let score: Int?
}

// MARK: - Crafting Sessions

struct CraftingSession: Codable, Identifiable {
    let id: String
    let userId: String
    let projectId: String?
    let date: Date
    let startedAt: Date?
    let endedAt: Date?
    let durationMinutes: Int
    let activeMinutes: Int?
    let source: String
    let notes: String?
    let rowsStart: Int?
    let rowsEnd: Int?
    let sectionStart: String?
    let sectionEnd: String?
    let stepStart: Int?
    let stepEnd: Int?
    let createdAt: Date
    let project: SessionProjectRef?
}

struct SessionProjectRef: Codable {
    let id: String
    let title: String
    let slug: String
}

// MARK: - Glossary

struct GlossaryTerm: Codable, Identifiable {
    let id: String
    let abbreviation: String?
    let name: String
    let slug: String
    let category: String
    let craftType: String
    let definition: String
    let howTo: String?
    let tips: String?
    let videoUrl: String?
    let videoStartS: Int?
    let videoEndS: Int?
    let videoIsShort: Bool?
    let videoAlternates: [String]?
    let difficulty: String
    let sortOrder: Int?
    let synonyms: [GlossarySynonym]?
}

struct GlossarySynonym: Codable, Identifiable {
    let id: String
    let synonym: String
    let region: String?
}

// MARK: - Tutorial

struct Tutorial: Codable, Identifiable {
    let id: String
    let slug: String
    let title: String
    let description: String?
    let category: String
    let craftType: String
    let difficulty: String
    let sortOrder: Int
    let steps: [TutorialStep]?
    let count: TutorialCount?

    enum CodingKeys: String, CodingKey {
        case id, slug, title, description, category, craftType, difficulty, sortOrder, steps
        case count = "_count"
    }
}

struct TutorialStep: Codable, Identifiable {
    let id: String
    let tutorialId: String
    let stepNumber: Int
    let title: String
    let content: String
    let imageUrl: String?
    let videoUrl: String?
}

struct TutorialCount: Codable {
    let steps: Int
}

struct TutorialProgress: Codable {
    let id: String
    let userId: String
    let tutorialId: String
    let completed: Bool
    let lastStep: Int
    let completedAt: Date?
}

// MARK: - Manual Section (Start Pattern Flow)

struct ManualSection: Identifiable {
    let id = UUID()
    var name: String
    var targetRows: Int?
}

// MARK: - Crafting Sessions

struct SessionSummary: Codable {
    let totalMinutes: Int
    let activeMinutes: Int
    let rowsWorked: Int
    let sectionStart: String?
    let sectionEnd: String?
    let stepStart: Int?
    let stepEnd: Int?
}

struct EndSessionResponse: Codable {
    let session: CraftingSession
    let summary: SessionSummary
}

// MARK: - AI Pattern Builder

struct PatternBuilderConfig: Codable {
    let projectTypes: [ProjectTypeConfig]
    let sizeCharts: [String: [String: [String: Double]]]
}

struct ProjectTypeConfig: Codable, Identifiable {
    let type: String
    let label: String
    let description: String
    let questions: [BuilderQuestion]
    let sizeChartKey: String
    let recommendedYarnWeights: [String]

    var id: String { type }
}

struct BuilderQuestion: Codable, Identifiable {
    let key: String
    let label: String
    let type: String
    let options: [BuilderQuestionOption]?
    let dependsOn: BuilderDependsOn?
    let required: Bool

    var id: String { key }
}

struct BuilderQuestionOption: Codable, Identifiable, Hashable {
    let value: String
    let label: String
    let description: String?
    let `default`: Bool?

    var id: String { value }
}

struct BuilderDependsOn: Codable {
    let key: String
    let values: [String]
}

// MARK: - Reviews

struct PatternReview: Codable, Identifiable {
    let id: String
    let userId: String
    let patternId: String
    let projectId: String?
    let rating: Double
    let difficultyRating: Double?
    let content: String?
    let wouldMakeAgain: Bool?
    let createdAt: Date
    let updatedAt: Date
    let user: ReviewAuthor
    let project: ReviewProject?
}

struct ReviewAuthor: Codable {
    let username: String
    let displayName: String?
    let avatarUrl: String?
}

struct ReviewProject: Codable, Identifiable {
    let id: String
    let title: String
}

struct ReviewsResponse: Codable {
    let items: [PatternReview]
    let total: Int
    let page: Int
    let pageSize: Int
    let hasMore: Bool
    let userReview: PatternReview?
}

// MARK: - Marketplace

struct MarketplacePattern: Codable, Identifiable {
    let id: String
    let slug: String
    let title: String
    let description: String?
    let craftType: String
    let difficulty: String?
    let garmentType: String?
    let yarnWeight: String?
    let coverImageUrl: String?
    let designerName: String?
    let priceCents: Int?
    let currency: String?
    let salesCount: Int?
    let rating: Double?
    let ratingCount: Int?
    let createdAt: Date
    let user: MarketplaceAuthor

    var formattedPrice: String {
        guard let cents = priceCents, cents > 0 else { return "Free" }
        return String(format: "$%.2f", Double(cents) / 100.0)
    }

    var isFree: Bool { priceCents == nil || priceCents == 0 }
}

struct MarketplaceAuthor: Codable {
    let id: String
    let username: String
    let displayName: String?
    let avatarUrl: String?
}

struct MarketplacePatternDetail: Codable {
    let id: String
    let slug: String
    let title: String
    let description: String?
    let craftType: String
    let difficulty: String?
    let garmentType: String?
    let yarnWeight: String?
    let coverImageUrl: String?
    let designerName: String?
    let priceCents: Int?
    let currency: String?
    let salesCount: Int?
    let rating: Double?
    let ratingCount: Int?
    let createdAt: Date
    let user: MarketplaceSellerInfo
    let sizes: [PatternSize]?
    let photos: [PatternPhoto]?
    let patternYarns: [PatternYarn]?
    let sections: [PatternSection]?  // null if not purchased
    let isOwner: Bool
    let isPurchased: Bool
    let hasAccess: Bool

    var formattedPrice: String {
        guard let cents = priceCents, cents > 0 else { return "Free" }
        return String(format: "$%.2f", Double(cents) / 100.0)
    }
}

struct MarketplaceSellerInfo: Codable {
    let id: String
    let username: String
    let displayName: String?
    let avatarUrl: String?
    let sellerBio: String?
}

struct PatternOwnership: Codable {
    let owned: Bool
    let purchased: Bool
    let free: Bool
    let hasAccess: Bool
    let purchaseDate: Date?
}

struct CheckoutResponse: Codable {
    let checkoutUrl: String
}

struct ConnectResponse: Codable {
    let url: String
}

struct ConnectStatus: Codable {
    let connected: Bool
    let chargesEnabled: Bool
    let detailsSubmitted: Bool?
    let onboardingUrl: String?
}

struct EarningsSummary: Codable {
    let totalSales: Int
    let totalEarningsCents: Int
    let thisMonthCents: Int
    let patternsListed: Int
    let recentSales: [RecentSale]
}

struct RecentSale: Codable, Identifiable {
    let id: String
    let priceCents: Int
    let platformFeeCents: Int
    let sellerAmountCents: Int
    let createdAt: Date
    let pattern: RecentSalePattern
    let buyer: RecentSaleBuyer
}

struct RecentSalePattern: Codable {
    let title: String
    let slug: String
}

struct RecentSaleBuyer: Codable {
    let username: String
    let displayName: String?
}

struct AgreementSection: Codable, Identifiable {
    let heading: String
    let body: String
    var id: String { heading }
}

struct Agreement: Codable {
    let version: String
    let title: String
    let sections: [AgreementSection]
}

struct AllAgreements: Codable {
    let buyer: Agreement
    let creator: Agreement
    let dmca: Agreement
}

