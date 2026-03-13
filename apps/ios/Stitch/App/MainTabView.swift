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
    @State private var selectedTab: AppTab = .feed
    @State private var patternsSubTab: PatternsTab = .myPatterns

    var body: some View {
        TabView(selection: $selectedTab) {
            FeedView()
                .tabItem {
                    Label("Feed", systemImage: "bubble.left.and.text.bubble.right")
                }
                .tag(AppTab.feed)

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
    }
}
