import SwiftUI

// MARK: - Follow List Type

enum FollowListType {
    case followers
    case following

    var title: String {
        switch self {
        case .followers: return "Followers"
        case .following: return "Following"
        }
    }

    var endpoint: String {
        switch self {
        case .followers: return "/social/followers"
        case .following: return "/social/following"
        }
    }

    var emptyMessage: String {
        switch self {
        case .followers: return "No followers yet"
        case .following: return "Not following anyone yet"
        }
    }
}

// MARK: - ViewModel

@Observable
final class FollowListViewModel {
    var users: [UserSummary] = []
    var isLoading = false
    var error: String?

    func load(type: FollowListType) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<PaginatedData<FollowUser>> = try await APIClient.shared.get(
                "\(type.endpoint)?limit=100"
            )
            users = response.data.items.map { u in
                UserSummary(
                    id: u.id,
                    username: u.username,
                    displayName: u.displayName,
                    avatarUrl: u.avatarUrl,
                    bio: u.bio,
                    isFollowing: type == .following ? true : u.isFollowing
                )
            }
        } catch is CancellationError {
            return
        } catch {
            self.error = error.localizedDescription
        }
    }

    func follow(userId: String) async {
        if let idx = users.firstIndex(where: { $0.id == userId }) {
            users[idx].isFollowing = true
        }
        struct Body: Encodable { let userId: String }
        do {
            struct Result: Decodable { let id: String }
            let _: APIResponse<Result> = try await APIClient.shared.post(
                "/social/follow", body: Body(userId: userId)
            )
        } catch {
            if let idx = users.firstIndex(where: { $0.id == userId }) {
                users[idx].isFollowing = false
            }
        }
    }

    func unfollow(userId: String) async {
        if let idx = users.firstIndex(where: { $0.id == userId }) {
            users[idx].isFollowing = false
        }
        struct Body: Encodable { let userId: String }
        do {
            struct Result: Decodable { let message: String? }
            let _: APIResponse<Result> = try await APIClient.shared.delete(
                "/social/follow", body: Body(userId: userId)
            )
        } catch {
            if let idx = users.firstIndex(where: { $0.id == userId }) {
                users[idx].isFollowing = true
            }
        }
    }
}

private struct FollowUser: Decodable {
    let id: String
    let username: String
    let displayName: String?
    let avatarUrl: String?
    let bio: String?
    let isFollowing: Bool?
}

// MARK: - View

struct FollowListView: View {
    let type: FollowListType
    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = FollowListViewModel()

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.users.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if viewModel.users.isEmpty {
                ContentUnavailableView(
                    type.emptyMessage,
                    systemImage: "person.2",
                    description: Text(type == .followers
                        ? "When people follow you, they'll appear here."
                        : "Find friends to follow.")
                )
            } else {
                List(viewModel.users) { user in
                    HStack(spacing: 10) {
                        AvatarImage(url: user.avatarUrl, size: 40)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(user.displayName ?? user.username)
                                .font(.subheadline.weight(.semibold))
                            Text("@\(user.username)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        let isFollowing = user.isFollowing ?? false
                        Button {
                            Task {
                                if isFollowing {
                                    await viewModel.unfollow(userId: user.id)
                                } else {
                                    await viewModel.follow(userId: user.id)
                                }
                            }
                        } label: {
                            Text(isFollowing ? "Following" : "Follow")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(isFollowing ? Color.secondary : Color.white)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 6)
                                .background(isFollowing ? Color(.systemGray5) : theme.primary)
                                .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .navigationTitle(type.title)
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.load(type: type) }
        .errorAlert(error: $viewModel.error)
    }
}
