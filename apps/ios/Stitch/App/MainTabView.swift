import SwiftUI

enum AppTab: String {
    case feed
    case projects
    case stash
    case patterns
    case profile
}

struct MainTabView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(NotificationService.self) private var notifications
    @State private var selectedTab: AppTab = .feed
    @State private var patternsSubTab: PatternsTab = .myPatterns

    var body: some View {
        TabView(selection: $selectedTab) {
            FeedView()
                .tabItem {
                    Label("Feed", systemImage: "bubble.left.and.text.bubble.right")
                }
                .tag(AppTab.feed)
                .badge(notifications.unreadCount)

            ProjectsView(selectedTab: $selectedTab, patternsSubTab: $patternsSubTab)
                .tabItem {
                    Label("Projects", systemImage: "folder")
                }
                .tag(AppTab.projects)

            StashTabView()
                .tabItem {
                    Label("Stash", systemImage: "tray.full")
                }
                .tag(AppTab.stash)

            PatternsView(initialSubTab: $patternsSubTab)
                .tabItem {
                    Label("Patterns", systemImage: "book.closed")
                }
                .tag(AppTab.patterns)

            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.circle")
                }
                .tag(AppTab.profile)
        }
        .tint(theme.primary)
        .preferredColorScheme(theme.colorScheme)
        .overlay(alignment: .bottom) {
            if CraftingSessionManager.shared.showSummaryToast,
               let summary = CraftingSessionManager.shared.lastSummary {
                SessionSummaryToast(summary: summary)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .padding(.bottom, 100)
                    .onTapGesture {
                        withAnimation { CraftingSessionManager.shared.showSummaryToast = false }
                    }
                    .task {
                        try? await Task.sleep(for: .seconds(3))
                        withAnimation { CraftingSessionManager.shared.showSummaryToast = false }
                    }
            }
        }
        .animation(.easeInOut, value: CraftingSessionManager.shared.showSummaryToast)
        .task {
            await CraftingSessionManager.shared.cleanupAbandonedSession()
        }
    }
}
