import SwiftUI

struct FeedView: View {
    @State private var viewModel = FeedViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.items.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.items.isEmpty {
                    ContentUnavailableView(
                        "Your feed is empty",
                        systemImage: "person.2",
                        description: Text("Follow other knitters to see their projects and activity.")
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(viewModel.items) { item in
                                feedItemView(item)
                                    .onAppear {
                                        if item.id == viewModel.items.last?.id {
                                            Task { await viewModel.loadMore() }
                                        }
                                    }
                            }

                            if viewModel.isLoadingMore {
                                ProgressView()
                                    .padding()
                            }
                        }
                        .padding(.horizontal)
                    }
                }
            }
            .navigationTitle("Stitch")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    HStack(spacing: 16) {
                        NavigationLink(value: Route.notifications) {
                            Image(systemName: "bell")
                        }
                        NavigationLink(value: Route.findFriends) {
                            Image(systemName: "person.badge.plus")
                        }
                    }
                }
            }
            .navigationDestination(for: Route.self) { route in
                switch route {
                case .findFriends:
                    FindFriendsView()
                case .notifications:
                    NotificationsView()
                case .postDetail(let id):
                    Text("Post \(id)") // placeholder
                default:
                    EmptyView()
                }
            }
        }
        .refreshable { await viewModel.loadFeed() }
        .task { await viewModel.loadFeed() }
    }

    @ViewBuilder
    private func feedItemView(_ item: FeedItem) -> some View {
        switch item.kind {
        case .post:
            if let post = item.post {
                PostCard(post: post) {
                    Task { await viewModel.toggleLike(item: item) }
                }
            }
        case .activity:
            if let activity = item.activity {
                ActivityCard(activity: activity) {
                    Task { await viewModel.toggleLike(item: item) }
                }
            }
        }
    }
}
