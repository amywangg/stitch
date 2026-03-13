import Foundation

@Observable
final class FeedViewModel {
    var items: [FeedItem] = []
    var isLoading = false
    var isLoadingMore = false
    var error: String?
    private var page = 1
    private var hasMore = true

    func loadFeed() async {
        isLoading = true
        page = 1
        defer { isLoading = false }
        do {
            let response: APIResponse<PaginatedData<FeedItem>> = try await APIClient.shared.get("/social/feed?page=1&limit=20")
            items = response.data.items
            hasMore = response.data.hasMore
        } catch {
            self.error = error.localizedDescription
        }
    }

    func loadMore() async {
        guard hasMore, !isLoadingMore else { return }
        isLoadingMore = true
        defer { isLoadingMore = false }
        do {
            let nextPage = page + 1
            let response: APIResponse<PaginatedData<FeedItem>> = try await APIClient.shared.get("/social/feed?page=\(nextPage)&limit=20")
            items.append(contentsOf: response.data.items)
            hasMore = response.data.hasMore
            page = nextPage
        } catch {
            self.error = error.localizedDescription
        }
    }

    func toggleLike(item: FeedItem) async {
        guard let idx = items.firstIndex(where: { $0.id == item.id }) else { return }

        // Optimistic: toggle immediately
        let previousItem = items[idx]
        items[idx] = toggledLikeState(for: items[idx])

        struct LikeResponse: Decodable { let liked: Bool }

        do {
            if item.kind == .post, let post = item.post {
                let _: APIResponse<LikeResponse> = try await APIClient.shared.post("/social/posts/\(post.id)/like")
            } else if item.kind == .activity, let activity = item.activity {
                let _: APIResponse<LikeResponse> = try await APIClient.shared.post("/social/activity/\(activity.id)/like")
            }
            // Server confirmed — state is already correct
        } catch {
            // Revert on failure
            items[idx] = previousItem
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
