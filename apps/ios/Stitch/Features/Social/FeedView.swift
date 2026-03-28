import SwiftUI

struct FeedView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(NotificationService.self) private var notificationService
    @State private var viewModel = FeedViewModel()
    @State private var commentsVM: CommentsViewModel?
    @State private var showCompose = false

    var body: some View {
        NavigationStack {
            tabContent
                .navigationBarTitleDisplayMode(.inline)
                .toolbar(.hidden, for: .navigationBar)
                .safeAreaInset(edge: .top) {
                    VStack(spacing: 0) {
                        feedHeader
                        tabPicker
                    }
                }
                .overlay(alignment: .bottomTrailing) {
                    composeButton
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
        .task { await viewModel.loadFeed() }
        .onChange(of: viewModel.selectedTab) { _, _ in
            if viewModel.items.isEmpty {
                Task { await viewModel.loadFeed() }
            }
        }
        .sheet(item: $commentsVM) { vm in
            CommentsView(viewModel: vm)
                .presentationDetents([.medium, .large])
        }
        .sheet(isPresented: $showCompose) {
            ComposePostView {
                Task { await viewModel.loadFeed() }
            }
        }
    }

    // MARK: - Header

    private var feedHeader: some View {
        HStack(alignment: .center) {
            Text("Stitch")
                .font(.largeTitle.bold())
            Spacer()
            HStack(spacing: 16) {
                ShareLink(
                    item: URL(string: "https://stitch.app")!,
                    message: Text("Come join me on Stitch — it's like Goodreads for knitting and crochet!")
                ) {
                    Image(systemName: "square.and.arrow.up")
                }
                NavigationLink(value: Route.notifications) {
                    Image(systemName: notificationService.unreadCount > 0 ? "bell.badge.fill" : "bell")
                        .symbolRenderingMode(.palette)
                        .foregroundStyle(notificationService.unreadCount > 0 ? theme.primary : .secondary, theme.primary)
                }
                NavigationLink(value: Route.findFriends) {
                    Image(systemName: "person.badge.plus")
                }
            }
            .foregroundStyle(theme.primary)
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 12)
        .background(Color(.systemBackground))
    }

    // MARK: - Tab Picker

    private var tabPicker: some View {
        HStack(spacing: 0) {
            ForEach(FeedTab.allCases, id: \.self) { tab in
                Button {
                    viewModel.selectedTab = tab
                } label: {
                    VStack(spacing: 6) {
                        Text(tab.label)
                            .font(.subheadline.weight(viewModel.selectedTab == tab ? .semibold : .regular))
                            .foregroundStyle(viewModel.selectedTab == tab ? .primary : .secondary)
                        Rectangle()
                            .fill(viewModel.selectedTab == tab ? theme.primary : .clear)
                            .frame(height: 2)
                    }
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, 16)
        .background(Color(.systemBackground))
    }

    // MARK: - Tab Content

    @ViewBuilder
    private var tabContent: some View {
        if viewModel.isLoading && viewModel.items.isEmpty {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if viewModel.items.isEmpty {
            emptyState
        } else {
            feedList
        }
    }

    private var emptyState: some View {
        ContentUnavailableView(
            viewModel.selectedTab == .social
                ? "No posts yet"
                : "No friend activity",
            systemImage: viewModel.selectedTab == .social
                ? "bubble.left.and.text.bubble.right"
                : "person.2",
            description: Text(
                viewModel.selectedTab == .social
                    ? "Follow other crafters to see their posts here."
                    : "Activity from mutual friends will show up here."
            )
        )
    }

    private var feedList: some View {
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
        .refreshable { await viewModel.loadFeed() }
    }

    // MARK: - Compose Button

    private var composeButton: some View {
        Button {
            showCompose = true
        } label: {
            Image(systemName: "plus")
                .font(.title2.weight(.semibold))
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(theme.primary, in: Circle())
                .shadow(color: .black.opacity(0.15), radius: 8, y: 4)
        }
        .padding(.trailing, 20)
        .padding(.bottom, 20)
    }

    @ViewBuilder
    private func feedItemView(_ item: FeedItem) -> some View {
        switch item.kind {
        case .post:
            if let post = item.post {
                PostCard(post: post, onLike: {
                    Task { await viewModel.toggleLike(item: item) }
                }, onComment: {
                    commentsVM = CommentsViewModel(postId: post.id)
                })
            }
        case .activity:
            if let activity = item.activity {
                ActivityCard(activity: activity, onLike: {
                    Task { await viewModel.toggleLike(item: item) }
                }, onComment: {
                    commentsVM = CommentsViewModel(activityEventId: activity.id)
                })
            }
        }
    }
}
