import SwiftUI

struct FindFriendsView: View {
    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = FindFriendsViewModel()

    var body: some View {
        List {
            // Invite banner
            Section {
                ShareLink(
                    item: URL(string: "https://stitch.app")!,
                    message: Text("Come join me on Stitch — it's like Goodreads for knitting and crochet!")
                ) {
                    HStack(spacing: 12) {
                        Image(systemName: "envelope.fill")
                            .font(.title3)
                            .foregroundStyle(.white)
                            .frame(width: 36, height: 36)
                            .background(theme.primary)
                            .clipShape(Circle())

                        VStack(alignment: .leading, spacing: 2) {
                            Text("Invite friends to Stitch")
                                .font(.subheadline.weight(.semibold))
                            Text("Share a link via message, email, or social")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        Image(systemName: "square.and.arrow.up")
                            .font(.body)
                            .foregroundStyle(theme.primary)
                    }
                }
                .buttonStyle(.plain)
            }

            // Search section
            Section {
                TextField("Search by username", text: $viewModel.searchQuery)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .onChange(of: viewModel.searchQuery) {
                        Task { await viewModel.search() }
                    }

                if viewModel.isSearching {
                    ProgressView()
                }

                ForEach(viewModel.searchResults) { user in
                    userRow(user: user, ravelryUsername: nil)
                }
            } header: {
                Text("Search users")
            }

            // Ravelry friends on Stitch
            if let friends = viewModel.ravelryFriends {
                if !friends.onStitch.isEmpty {
                    Section {
                        ForEach(friends.onStitch, id: \.user.id) { match in
                            userRow(
                                user: match.user,
                                ravelryUsername: match.ravelryUsername,
                                isFollowing: match.isFollowing
                            )
                        }
                    } header: {
                        Text("Ravelry friends on Stitch")
                    }
                }

                if !friends.notOnStitch.isEmpty {
                    Section {
                        ForEach(friends.notOnStitch, id: \.ravelryUsername) { friend in
                            HStack(spacing: 10) {
                                AsyncImage(url: URL(string: friend.photoUrl ?? "")) { image in
                                    image.resizable().scaledToFill()
                                } placeholder: {
                                    Color.gray.opacity(0.3)
                                }
                                .frame(width: 36, height: 36)
                                .clipShape(Circle())

                                Text(friend.ravelryUsername)
                                    .font(.subheadline)

                                Spacer()

                                ShareLink(
                                    item: URL(string: "https://stitch.app")!,
                                    message: Text("Join me on Stitch!")
                                ) {
                                    Text("Invite")
                                        .font(.subheadline.weight(.medium))
                                        .foregroundStyle(theme.primary)
                                }
                            }
                        }
                    } header: {
                        Text("Invite to Stitch")
                    }
                }
            } else if viewModel.isLoadingRavelry {
                Section {
                    ProgressView("Loading Ravelry friends...")
                }
            }
        }
        .navigationTitle("Find friends")
        .task { await viewModel.loadRavelryFriends() }
    }

    @ViewBuilder
    private func userRow(user: UserSummary, ravelryUsername: String?, isFollowing: Bool? = nil) -> some View {
        let following = isFollowing ?? user.isFollowing ?? false

        HStack(spacing: 10) {
            AsyncImage(url: URL(string: user.avatarUrl ?? "")) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Color.gray.opacity(0.3)
            }
            .frame(width: 40, height: 40)
            .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(user.displayName ?? user.username)
                    .font(.subheadline.weight(.semibold))
                Text("@\(user.username)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
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
                    .foregroundColor(following ? .secondary : .white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(following ? Color(.systemGray5) : theme.primary)
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
        }
    }
}
