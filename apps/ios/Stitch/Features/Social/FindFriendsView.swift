import SwiftUI

struct FindFriendsView: View {
    @State private var viewModel = FindFriendsViewModel()

    var body: some View {
        List {
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
                                        .foregroundStyle(Color(hex: "#4ECDC4"))
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
                    .background(following ? Color(.systemGray5) : Color(hex: "#FF6B6B"))
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
        }
    }
}
