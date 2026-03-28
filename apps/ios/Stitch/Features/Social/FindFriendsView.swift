import SwiftUI

struct FindFriendsView: View {
    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = FindFriendsViewModel()

    var body: some View {
        List {
            // Search section
            Section {
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.secondary)
                    TextField("Search by username", text: $viewModel.searchQuery)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }
                .onChange(of: viewModel.searchQuery) {
                    Task { await viewModel.search() }
                }

                if viewModel.isSearching {
                    HStack { Spacer(); ProgressView().controlSize(.small); Spacer() }
                }

                ForEach(viewModel.searchResults) { user in
                    stitchUserRow(user: user)
                }
            }

            // Ravelry friends on Stitch — follow them
            if let friends = viewModel.ravelryFriends, !friends.onStitch.isEmpty {
                Section {
                    ForEach(friends.onStitch, id: \.user.id) { match in
                        stitchUserRow(
                            user: match.user,
                            ravelryUsername: match.ravelryUsername,
                            isFollowing: match.isFollowing
                        )
                    }
                } header: {
                    Label("Ravelry friends on Stitch", systemImage: "person.2.fill")
                } footer: {
                    Text("Friends from your Ravelry who also use Stitch.")
                }
            }

            // Ravelry friends NOT on Stitch — invite them
            if let friends = viewModel.ravelryFriends, !friends.notOnStitch.isEmpty {
                Section {
                    ForEach(friends.notOnStitch, id: \.ravelryUsername) { friend in
                        ravelryInviteRow(friend)
                    }
                } header: {
                    Label("Invite from Ravelry", systemImage: "envelope")
                } footer: {
                    Text("\(friends.notOnStitch.count) Ravelry friend\(friends.notOnStitch.count == 1 ? "" : "s") not on Stitch yet.")
                }
            }

            // Loading state for ravelry
            if viewModel.isLoadingRavelry && viewModel.ravelryFriends == nil {
                Section {
                    HStack(spacing: 10) {
                        ProgressView().controlSize(.small)
                        Text("Loading Ravelry friends...")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            // General invite
            Section {
                ShareLink(
                    item: URL(string: "https://stitch.app")!,
                    message: Text("Come join me on Stitch — it's like Goodreads for knitting and crochet!")
                ) {
                    HStack(spacing: 12) {
                        Image(systemName: "square.and.arrow.up")
                            .font(.body)
                            .foregroundStyle(theme.primary)
                            .frame(width: 28)

                        VStack(alignment: .leading, spacing: 2) {
                            Text("Share Stitch")
                                .font(.subheadline.weight(.medium))
                            Text("Send a link to anyone")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()
                    }
                }
                .buttonStyle(.plain)
            }
        }
        .navigationTitle("Find friends")
        .task { await viewModel.loadRavelryFriends() }
        .errorAlert(error: $viewModel.error)
    }

    // MARK: - Stitch User Row

    private func stitchUserRow(user: UserSummary, ravelryUsername: String? = nil, isFollowing: Bool? = nil) -> some View {
        let following = isFollowing ?? user.isFollowing ?? false

        return HStack(spacing: 10) {
            AvatarImage(url: user.avatarUrl, size: 40)

            VStack(alignment: .leading, spacing: 2) {
                Text(user.displayName ?? user.username)
                    .font(.subheadline.weight(.semibold))
                HStack(spacing: 4) {
                    Text("@\(user.username)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    if let rav = ravelryUsername {
                        Text("· \(rav) on Ravelry")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }
            }

            Spacer()

            Button {
                Task {
                    if following {
                        await viewModel.unfollow(userId: user.id)
                    } else {
                        await viewModel.follow(userId: user.id)
                    }
                }
            } label: {
                Text(following ? "Following" : "Follow")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(following ? Color.secondary : Color.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(following ? Color(.systemGray5) : theme.primary)
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Ravelry Invite Row

    private func ravelryInviteRow(_ friend: RavelryFriendNotOnStitch) -> some View {
        HStack(spacing: 10) {
            AvatarImage(url: friend.photoUrl, size: 36)

            VStack(alignment: .leading, spacing: 2) {
                Text(friend.ravelryUsername)
                    .font(.subheadline.weight(.medium))
                Text("On Ravelry")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }

            Spacer()

            ShareLink(
                item: URL(string: "https://stitch.app?ref=ravelry")!,
                message: Text("Hey \(friend.ravelryUsername)! I'm using Stitch for my knitting — it syncs with Ravelry. Check it out!")
            ) {
                Text("Invite")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(theme.primary)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(theme.primary.opacity(0.12))
                    .clipShape(Capsule())
            }
        }
    }
}
