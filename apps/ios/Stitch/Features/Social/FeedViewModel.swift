import Foundation

enum FeedTab: String, CaseIterable {
    case social
    case activity

    var label: String {
        switch self {
        case .social: return "Social"
        case .activity: return "Activity"
        }
    }

    var queryParam: String { rawValue }
}

@Observable
final class FeedViewModel {
    // Per-tab state
    var socialItems: [FeedItem] = []
    var activityItems: [FeedItem] = []
    var isLoading = false
    var isLoadingMore = false
    var error: String?
    private var socialPage = 1
    private var activityPage = 1
    private var socialHasMore = true
    private var activityHasMore = true

    var selectedTab: FeedTab = .social

    var items: [FeedItem] {
        selectedTab == .social ? socialItems : activityItems
    }

    private var currentPage: Int {
        get { selectedTab == .social ? socialPage : activityPage }
        set {
            if selectedTab == .social { socialPage = newValue }
            else { activityPage = newValue }
        }
    }

    private var currentHasMore: Bool {
        selectedTab == .social ? socialHasMore : activityHasMore
    }

    // MARK: - Load

    func loadFeed() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<PaginatedData<FeedItem>> = try await APIClient.shared.get(
                "/social/feed?type=\(selectedTab.queryParam)&page=1&limit=20"
            )
            if selectedTab == .social {
                socialItems = response.data.items
                socialHasMore = response.data.hasMore
                socialPage = 1
            } else {
                activityItems = response.data.items
                activityHasMore = response.data.hasMore
                activityPage = 1
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func loadMore() async {
        guard currentHasMore, !isLoadingMore else { return }
        isLoadingMore = true
        defer { isLoadingMore = false }
        let tab = selectedTab
        do {
            let nextPage = currentPage + 1
            let response: APIResponse<PaginatedData<FeedItem>> = try await APIClient.shared.get(
                "/social/feed?type=\(tab.queryParam)&page=\(nextPage)&limit=20"
            )
            if tab == .social {
                socialItems.append(contentsOf: response.data.items)
                socialHasMore = response.data.hasMore
                socialPage = nextPage
            } else {
                activityItems.append(contentsOf: response.data.items)
                activityHasMore = response.data.hasMore
                activityPage = nextPage
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Like

    func toggleLike(item: FeedItem) async {
        let tab = selectedTab
        let list = tab == .social ? socialItems : activityItems
        guard let idx = list.firstIndex(where: { $0.id == item.id }) else { return }

        let previousItem = list[idx]
        let toggled = toggledLikeState(for: list[idx])

        if tab == .social { socialItems[idx] = toggled }
        else { activityItems[idx] = toggled }

        struct LikeResponse: Decodable { let liked: Bool }

        do {
            if item.kind == .post, let post = item.post {
                let _: APIResponse<LikeResponse> = try await APIClient.shared.post("/social/posts/\(post.id)/like")
            } else if item.kind == .activity, let activity = item.activity {
                let _: APIResponse<LikeResponse> = try await APIClient.shared.post("/social/activity/\(activity.id)/like")
            }
        } catch {
            if tab == .social { socialItems[idx] = previousItem }
            else { activityItems[idx] = previousItem }
        }
    }

    private func toggledLikeState(for item: FeedItem) -> FeedItem {
        if item.kind == .post, var post = item.post {
            post.isLiked.toggle()
            return FeedItem(kind: .post, id: item.id, createdAt: item.createdAt, post: post, activity: nil)
        } else if item.kind == .activity, var activity = item.activity {
            activity.isLiked.toggle()
            return FeedItem(kind: .activity, id: item.id, createdAt: item.createdAt, post: nil, activity: activity)
        }
        return item
    }
}
