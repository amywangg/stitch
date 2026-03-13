import Foundation

@Observable
final class FindFriendsViewModel {
    var searchQuery = ""
    var searchResults: [UserSummary] = []
    var ravelryFriends: RavelryFriendsResponse?
    var isSearching = false
    var isLoadingRavelry = false
    var error: String?

    func search() async {
        guard searchQuery.count >= 2 else {
            searchResults = []
            return
        }
        isSearching = true
        defer { isSearching = false }
        do {
            let encoded = searchQuery.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? searchQuery
            let response: APIResponse<[UserSummary]> = try await APIClient.shared.get("/social/users/search?q=\(encoded)")
            searchResults = response.data
        } catch {
            self.error = error.localizedDescription
        }
    }

    func loadRavelryFriends() async {
        isLoadingRavelry = true
        defer { isLoadingRavelry = false }
        do {
            let response: APIResponse<RavelryFriendsResponse> = try await APIClient.shared.get("/social/friends/ravelry")
            ravelryFriends = response.data
        } catch {
            // Ravelry not connected — that's okay
        }
    }

    func follow(userId: String) async {
        // Optimistic: update UI immediately
        setFollowState(userId: userId, following: true)

        do {
            let _: APIResponse<FollowResponse> = try await APIClient.shared.post("/social/follow", body: ["userId": userId])
        } catch {
            // Revert on failure
            setFollowState(userId: userId, following: false)
            self.error = error.localizedDescription
        }
    }

    func unfollow(userId: String) async {
        // Optimistic: update UI immediately
        setFollowState(userId: userId, following: false)

        do {
            let _: APIResponse<MessageResponse> = try await APIClient.shared.delete("/social/follow", body: ["userId": userId])
        } catch {
            // Revert on failure
            setFollowState(userId: userId, following: true)
            self.error = error.localizedDescription
        }
    }

    private func setFollowState(userId: String, following: Bool) {
        if let idx = searchResults.firstIndex(where: { $0.id == userId }) {
            var updated = searchResults[idx]
            updated.isFollowing = following
            searchResults[idx] = updated
        }
        if let friends = ravelryFriends {
            ravelryFriends = RavelryFriendsResponse(
                onStitch: friends.onStitch.map { f in
                    if f.user.id == userId {
                        return RavelryFriendMatch(user: f.user, isFollowing: following, ravelryUsername: f.ravelryUsername)
                    }
                    return f
                },
                notOnStitch: friends.notOnStitch
            )
        }
    }
}

private struct FollowResponse: Decodable {
    let id: String
}

private struct MessageResponse: Decodable {
    let message: String?
}
