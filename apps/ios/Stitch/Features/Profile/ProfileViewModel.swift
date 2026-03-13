import Foundation

// MARK: - Profile Summary Response

struct ProfileSummary: Decodable {
    let user: ProfileUser
    let stats: ProfileStats
    let recentProjects: [ProfileProject]
    let stashBreakdown: [String: StashWeightEntry]
    let recentActivity: [ProfileActivityEvent]
    let heatmap: [HeatmapDay]
    let recentReviews: [ProfileReview]
    let queuePreview: [ProfileQueueItem]
    let savedPatternsPreview: [ProfileSavedPattern]
    let needleBreakdown: [String: Int]
    let ravelry: RavelryInfo?
    let subscription: SubscriptionInfo?
}

struct ProfileUser: Decodable {
    let id: String
    let username: String
    let displayName: String?
    let avatarUrl: String?
    let bio: String?
    let location: String?
    let website: String?
    let craftPreference: String
    let experienceLevel: String?
    let isPro: Bool
    let memberSince: Date
}

struct ProfileStats: Decodable {
    let projects: Int
    let activeProjects: Int
    let completedProjects: Int
    let followers: Int
    let following: Int
    let stashItems: Int
    let needles: Int
    let reviews: Int
    let savedPatterns: Int
    let queueItems: Int
    let totalSkeins: Double
    let totalCraftingMinutesThisYear: Int
}

struct ProfileProject: Decodable, Identifiable {
    let id: String
    let title: String
    let slug: String
    let status: String
    let craftType: String
    let photos: [ProfileProjectPhoto]
    let sections: [ProfileProjectSection]
}

struct ProfileProjectPhoto: Decodable {
    let url: String
}

struct ProfileProjectSection: Decodable {
    let currentRow: Int
    let targetRows: Int?
}

struct StashWeightEntry: Decodable {
    let skeins: Double
    let count: Int
}

struct ProfileActivityEvent: Decodable, Identifiable {
    let id: String
    let type: String
    let metadata: [String: AnyCodableValue]?
    let createdAt: Date
    let project: ProfileActivityRef?
    let pattern: ProfileActivityRef?
}

struct ProfileActivityRef: Decodable {
    let id: String
    let title: String
    let slug: String
}

struct ProfileReview: Decodable, Identifiable {
    let id: String
    let rating: Double
    let difficultyRating: Double?
    let content: String?
    let wouldMakeAgain: Bool?
    let createdAt: Date
    let pattern: ProfileReviewPattern
}

struct ProfileReviewPattern: Decodable {
    let id: String
    let title: String
    let slug: String
    let coverImageUrl: String?
    let designerName: String?
}

struct ProfileQueueItem: Decodable, Identifiable {
    let id: String
    let pattern: ProfileQueuePattern
}

struct ProfileQueuePattern: Decodable {
    let id: String
    let title: String
    let slug: String
    let coverImageUrl: String?
    let designerName: String?
}

struct ProfileSavedPattern: Decodable, Identifiable {
    let id: String
    let name: String
    let photoUrl: String?
    let designer: String?
    let permalink: String
}

struct HeatmapDay: Decodable {
    let date: String
    let minutes: Int
}

struct RavelryInfo: Decodable {
    let ravelryUsername: String
    let syncedAt: Date?
    let importStatus: String
}

struct SubscriptionInfo: Decodable {
    let plan: String
    let status: String
}

// MARK: - ViewModel

@Observable
final class ProfileViewModel {
    var summary: ProfileSummary?
    var isLoading = false
    var error: String?

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<ProfileSummary> = try await APIClient.shared.get("/users/me/profile-summary")
            summary = response.data
        } catch {
            self.error = error.localizedDescription
        }
    }
}
