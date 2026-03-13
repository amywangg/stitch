import SwiftUI

struct ProfileView: View {
    @State private var viewModel = ProfileViewModel()
    @State private var showingEditProfile = false

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.summary == nil {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let summary = viewModel.summary {
                    ScrollView {
                        VStack(spacing: 0) {
                            profileHeader(summary.user, stats: summary.stats)
                            statsGrid(summary.stats)
                            craftingHeatmap(summary.heatmap, stats: summary.stats)
                            recentProjectsSection(summary.recentProjects, stats: summary.stats)
                            queueSection(summary.queuePreview, count: summary.stats.queueItems)
                            favoritesSection(summary.savedPatternsPreview, count: summary.stats.savedPatterns)
                            stashSection(summary.stashBreakdown, stats: summary.stats)
                            needlesSection(summary.needleBreakdown, count: summary.stats.needles)
                            reviewsSection(summary.recentReviews, count: summary.stats.reviews)
                            recentActivitySection(summary.recentActivity)
                            ravelrySection(summary.ravelry)
                        }
                        .padding(.bottom, 32)
                    }
                } else if viewModel.error != nil {
                    ContentUnavailableView(
                        "Could not load profile",
                        systemImage: "person.crop.circle.badge.exclamationmark",
                        description: Text("Pull to refresh and try again.")
                    )
                }
            }
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink {
                        SettingsView()
                    } label: {
                        Image(systemName: "gear")
                    }
                }
            }
            .navigationDestination(for: Route.self) { route in
                switch route {
                case .findFriends:
                    FindFriendsView()
                case .notifications:
                    NotificationsView()
                case .stash:
                    StashView()
                case .needles:
                    NeedlesView()
                case .queue:
                    EmptyView()
                default:
                    EmptyView()
                }
            }
        }
        .refreshable { await viewModel.load() }
        .task { await viewModel.load() }
    }

    // ─── Header ──────────────────────────────────────────────────────────────

    private func profileHeader(_ user: ProfileUser, stats: ProfileStats) -> some View {
        VStack(spacing: 14) {
            // Avatar with Pro ring
            AsyncImage(url: URL(string: user.avatarUrl ?? "")) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Image(systemName: "person.circle.fill")
                    .resizable()
                    .foregroundStyle(.gray.opacity(0.3))
            }
            .frame(width: 96, height: 96)
            .clipShape(Circle())
            .overlay(
                Circle()
                    .stroke(
                        user.isPro ? Color(hex: "#FF6B6B") : Color.clear,
                        lineWidth: 3
                    )
                    .padding(-2)
            )

            // Name + Pro badge
            HStack(spacing: 6) {
                Text(user.displayName ?? user.username)
                    .font(.title2.weight(.bold))

                if user.isPro {
                    Text("PRO")
                        .font(.system(size: 10, weight: .heavy))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(hex: "#FF6B6B"))
                        .clipShape(Capsule())
                }
            }

            Text("@\(user.username)")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            // Bio
            if let bio = user.bio, !bio.isEmpty {
                Text(bio)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }

            // Metadata chips
            FlowLayout(spacing: 8) {
                if let location = user.location, !location.isEmpty {
                    profileChip(icon: "location", text: location)
                }
                profileChip(icon: "scissors", text: craftLabel(user.craftPreference))
                if let level = user.experienceLevel, !level.isEmpty {
                    profileChip(icon: "chart.bar", text: level.capitalized)
                }
                if let website = user.website, !website.isEmpty {
                    profileChip(icon: "link", text: cleanURL(website))
                }
                profileChip(
                    icon: "calendar",
                    text: "Joined \(user.memberSince.formatted(.dateTime.month(.abbreviated).year()))"
                )
            }
            .padding(.horizontal)

            // Edit profile + Find friends buttons
            HStack(spacing: 10) {
                Button {
                    showingEditProfile = true
                } label: {
                    Text("Edit profile")
                        .font(.subheadline.weight(.medium))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color(.systemGray5))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)

                NavigationLink(value: Route.findFriends) {
                    Text("Find friends")
                        .font(.subheadline.weight(.medium))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color(.systemGray5))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal)
            .padding(.top, 4)
        }
        .padding(.vertical, 20)
        .sheet(isPresented: $showingEditProfile) {
            EditProfileSheet(user: user) {
                Task { await viewModel.load() }
            }
        }
    }

    private func profileChip(icon: String, text: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 10))
            Text(text)
                .font(.caption)
        }
        .foregroundStyle(.secondary)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color(.systemGray6))
        .clipShape(Capsule())
    }

    // ─── Stats Grid ──────────────────────────────────────────────────────────

    private func statsGrid(_ stats: ProfileStats) -> some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 4), spacing: 12) {
            statCell(value: stats.projects, label: "Projects")
            statCell(value: stats.completedProjects, label: "Finished")
            NavigationLink(value: Route.findFriends) {
                statCellContent(value: stats.followers, label: "Followers")
            }
            .buttonStyle(.plain)
            NavigationLink(value: Route.findFriends) {
                statCellContent(value: stats.following, label: "Following")
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal)
        .padding(.vertical, 14)
        .background(Color(.secondarySystemBackground))
    }

    private func statCell(value: Int, label: String) -> some View {
        statCellContent(value: value, label: label)
    }

    private func statCellContent(value: Int, label: String) -> some View {
        VStack(spacing: 2) {
            Text("\(value)")
                .font(.headline)
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    // ─── Crafting Heatmap ────────────────────────────────────────────────────

    private func craftingHeatmap(_ heatmap: [HeatmapDay], stats: ProfileStats) -> some View {
        profileSection(title: "Crafting activity", trailing: {
            if stats.totalCraftingMinutesThisYear > 0 {
                Text(formatCraftingTime(stats.totalCraftingMinutesThisYear) + " this year")
                    .font(.caption)
                    .foregroundStyle(Color(hex: "#4ECDC4"))
            }
        }) {
            if heatmap.isEmpty {
                emptyState("No crafting sessions logged yet")
            } else {
                HeatmapGrid(days: heatmap)
            }
        }
    }

    // ─── Recent Projects ─────────────────────────────────────────────────────

    private func recentProjectsSection(_ projects: [ProfileProject], stats: ProfileStats) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionHeader(
                title: "Projects",
                count: stats.projects,
                countLabel: "\(stats.activeProjects) active"
            )
            .padding(.horizontal)

            if projects.isEmpty {
                emptyState("No projects yet")
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(projects) { project in
                            projectCard(project)
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
        .padding(.vertical, 8)
    }

    private func projectCard(_ project: ProfileProject) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            ZStack(alignment: .bottomTrailing) {
                if let photo = project.photos.first {
                    AsyncImage(url: URL(string: photo.url)) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        Color.gray.opacity(0.15)
                    }
                } else {
                    Rectangle()
                        .fill(Color(.systemGray6))
                        .overlay {
                            Image(systemName: project.craftType == "crochet" ? "link" : "scissors")
                                .font(.title2)
                                .foregroundStyle(.tertiary)
                        }
                }

                // Status pill
                Text(project.status.capitalized)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(statusColor(project.status))
                    .clipShape(Capsule())
                    .padding(6)
            }
            .frame(width: 130, height: 170)
            .clipShape(RoundedRectangle(cornerRadius: 12))

            Text(project.title)
                .font(.caption.weight(.medium))
                .lineLimit(1)
                .truncationMode(.tail)
                .frame(width: 130, alignment: .leading)

            // Progress bar
            if project.status == "active",
               let section = project.sections.first,
               let target = section.targetRows, target > 0 {
                ProgressView(value: Double(section.currentRow), total: Double(target))
                    .tint(Color(hex: "#FF6B6B"))
                    .frame(width: 130)
            }
        }
    }

    // ─── Queue ───────────────────────────────────────────────────────────────

    private func queueSection(_ items: [ProfileQueueItem], count: Int) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                sectionHeader(title: "Queue", count: count, countLabel: "want to make")
                NavigationLink(value: Route.queue) {
                    HStack(spacing: 2) {
                        Text("See all")
                            .font(.caption)
                        Image(systemName: "chevron.right")
                            .font(.caption2)
                    }
                    .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal)

            if items.isEmpty {
                emptyState("Queue is empty")
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(items) { item in
                            patternThumbnail(
                                title: item.pattern.title,
                                imageUrl: item.pattern.coverImageUrl,
                                designer: item.pattern.designerName
                            )
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
        .padding(.vertical, 8)
    }

    // ─── Favorites / Saved Patterns ──────────────────────────────────────────

    private func favoritesSection(_ patterns: [ProfileSavedPattern], count: Int) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionHeader(title: "Favorites", count: count, countLabel: "saved")
                .padding(.horizontal)

            if patterns.isEmpty {
                emptyState("No saved patterns yet")
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(patterns) { pattern in
                            let photoUrl: String? = pattern.photoUrl.map { path in
                                path.hasPrefix("http") ? path : "https://images4.ravelry.com\(path)"
                            }
                            patternThumbnail(
                                title: pattern.name,
                                imageUrl: photoUrl,
                                designer: pattern.designer
                            )
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
        .padding(.vertical, 8)
    }

    /// Shared pattern thumbnail used by queue and favorites
    private func patternThumbnail(title: String, imageUrl: String?, designer: String?) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Group {
                if let url = imageUrl {
                    AsyncImage(url: URL(string: url)) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        Color.gray.opacity(0.15)
                    }
                } else {
                    Rectangle()
                        .fill(Color(.systemGray6))
                        .overlay {
                            Image(systemName: "book.closed")
                                .foregroundStyle(.tertiary)
                        }
                }
            }
            // 2:3 portrait ratio per design system
            .frame(width: 100, height: 150)
            .clipShape(RoundedRectangle(cornerRadius: 8))

            Text(title)
                .font(.caption.weight(.medium))
                .lineLimit(1)
                .truncationMode(.tail)
                .frame(width: 100, alignment: .leading)

            if let designer = designer {
                Text(designer)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .frame(width: 100, alignment: .leading)
            }
        }
    }

    // ─── Stash ───────────────────────────────────────────────────────────────

    private func stashSection(_ breakdown: [String: StashWeightEntry], stats: ProfileStats) -> some View {
        profileSection(title: "Yarn stash", trailing: {
            NavigationLink(value: Route.stash) {
                HStack(spacing: 4) {
                    if stats.stashItems > 0 {
                        Text("\(stats.stashItems) yarns")
                            .font(.caption)
                    }
                    Image(systemName: "chevron.right")
                        .font(.caption2)
                }
                .foregroundStyle(.secondary)
            }
        }) {
            if breakdown.isEmpty {
                emptyState("Stash is empty")
            } else {
                let sorted = breakdown.sorted { $0.value.skeins > $1.value.skeins }
                let maxSkeins = sorted.first?.value.skeins ?? 1

                VStack(spacing: 6) {
                    ForEach(sorted.prefix(6), id: \.key) { weight, entry in
                        HStack(spacing: 8) {
                            Text(formatWeight(weight))
                                .font(.caption)
                                .frame(width: 72, alignment: .trailing)
                                .foregroundStyle(.secondary)

                            GeometryReader { geo in
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color(hex: "#4ECDC4").opacity(0.7))
                                    .frame(
                                        width: max(4, geo.size.width * entry.skeins / maxSkeins)
                                    )
                            }
                            .frame(height: 14)

                            Text("\(Int(entry.skeins))")
                                .font(.caption2.monospacedDigit())
                                .foregroundStyle(.secondary)
                                .frame(width: 28, alignment: .leading)
                        }
                    }
                }
            }
        }
    }

    // ─── Needles & Hooks ─────────────────────────────────────────────────────

    private func needlesSection(_ breakdown: [String: Int], count: Int) -> some View {
        profileSection(title: "Needles & hooks", trailing: {
            NavigationLink(value: Route.needles) {
                HStack(spacing: 4) {
                    if count > 0 {
                        Text("\(count) total")
                            .font(.caption)
                    }
                    Image(systemName: "chevron.right")
                        .font(.caption2)
                }
                .foregroundStyle(.secondary)
            }
        }) {
            if breakdown.isEmpty {
                emptyState("No needles or hooks added")
            } else {
                HStack(spacing: 16) {
                    ForEach(Array(breakdown.sorted(by: { $0.value > $1.value })), id: \.key) { type, qty in
                        VStack(spacing: 4) {
                            Image(systemName: needleIcon(type))
                                .font(.title3)
                                .foregroundStyle(Color(hex: "#FF6B6B"))
                            Text("\(qty)")
                                .font(.subheadline.weight(.semibold))
                            Text(needleLabel(type))
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
            }
        }
    }

    // ─── Reviews ─────────────────────────────────────────────────────────────

    private func reviewsSection(_ reviews: [ProfileReview], count: Int) -> some View {
        profileSection(title: "Reviews", trailing: {
            if count > 0 {
                Text("\(count) patterns rated")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }) {
            if reviews.isEmpty {
                emptyState("No reviews yet")
            } else {
                VStack(spacing: 12) {
                    ForEach(reviews) { review in
                        reviewRow(review)
                    }
                }
            }
        }
    }

    private func reviewRow(_ review: ProfileReview) -> some View {
        HStack(spacing: 10) {
            // Pattern cover
            if let url = review.pattern.coverImageUrl {
                AsyncImage(url: URL(string: url)) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Color.gray.opacity(0.15)
                }
                .frame(width: 44, height: 66)
                .clipShape(RoundedRectangle(cornerRadius: 6))
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(review.pattern.title)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)

                if let designer = review.pattern.designerName {
                    Text("by \(designer)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                // Star rating
                HStack(spacing: 2) {
                    ForEach(1...5, id: \.self) { star in
                        Image(systemName: starIcon(for: star, rating: review.rating))
                            .font(.system(size: 11))
                            .foregroundStyle(Color(hex: "#FF6B6B"))
                    }

                    if let difficulty = review.difficultyRating {
                        Text("·")
                            .foregroundStyle(.tertiary)
                        Text("Difficulty: \(String(format: "%.0f", difficulty))/5")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }

                if let content = review.content, !content.isEmpty {
                    Text(content)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                if let wouldMake = review.wouldMakeAgain {
                    HStack(spacing: 3) {
                        Image(systemName: wouldMake ? "arrow.counterclockwise" : "xmark")
                            .font(.system(size: 9))
                        Text(wouldMake ? "Would make again" : "Would not make again")
                            .font(.caption2)
                    }
                    .foregroundStyle(wouldMake ? Color(hex: "#4ECDC4") : .secondary)
                }
            }

            Spacer()
        }
    }

    // ─── Recent Activity ─────────────────────────────────────────────────────

    private func recentActivitySection(_ events: [ProfileActivityEvent]) -> some View {
        profileSection(title: "Recent activity") {
            if events.isEmpty {
                emptyState("No recent activity")
            } else {
                VStack(spacing: 0) {
                    ForEach(events) { event in
                        activityRow(event)
                        if event.id != events.last?.id {
                            Divider().padding(.leading, 36)
                        }
                    }
                }
            }
        }
    }

    private func activityRow(_ event: ProfileActivityEvent) -> some View {
        HStack(spacing: 10) {
            Image(systemName: activityIcon(event.type))
                .font(.subheadline)
                .foregroundStyle(activityColor(event.type))
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(activityDescription(event))
                    .font(.subheadline)
                    .lineLimit(1)
                Text(event.createdAt, style: .relative)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }

            Spacer()
        }
        .padding(.vertical, 6)
    }

    // ─── Ravelry ─────────────────────────────────────────────────────────────

    private func ravelrySection(_ ravelry: RavelryInfo?) -> some View {
        Group {
            if let rav = ravelry {
                NavigationLink {
                    RavelerySyncView()
                } label: {
                    HStack(spacing: 12) {
                        Text("R")
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(.white)
                            .frame(width: 32, height: 32)
                            .background(Color.orange)
                            .clipShape(RoundedRectangle(cornerRadius: 8))

                        VStack(alignment: .leading, spacing: 1) {
                            Text("Ravelry")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(.primary)
                            Text("@\(rav.ravelryUsername)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        if let synced = rav.syncedAt {
                            VStack(alignment: .trailing, spacing: 1) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(.green)
                                    .font(.subheadline)
                                Text("Synced \(synced, style: .relative) ago")
                                    .font(.caption2)
                                    .foregroundStyle(.tertiary)
                            }
                        }

                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .padding(.horizontal)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, 4)
    }

    // ─── Reusable Section Components ─────────────────────────────────────────

    private func profileSection<Trailing: View, Content: View>(
        title: String,
        @ViewBuilder trailing: () -> Trailing = { EmptyView() },
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                Spacer()
                trailing()
            }

            content()
        }
        .padding()
    }

    private func sectionHeader(title: String, count: Int, countLabel: String) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .font(.subheadline.weight(.semibold))
            Text("\(count)")
                .font(.subheadline.weight(.bold))
                .foregroundStyle(Color(hex: "#FF6B6B"))
            if count > 0 {
                Text(countLabel)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
    }

    private func emptyState(_ message: String) -> some View {
        Text(message)
            .font(.caption)
            .foregroundStyle(.tertiary)
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.vertical, 12)
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private func craftLabel(_ pref: String) -> String {
        switch pref {
        case "knitting": return "Knitter"
        case "crochet": return "Crocheter"
        default: return "Knitter & crocheter"
        }
    }

    private func cleanURL(_ url: String) -> String {
        url.replacingOccurrences(of: "https://", with: "")
            .replacingOccurrences(of: "http://", with: "")
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "completed": return .green
        case "active": return Color(hex: "#4ECDC4")
        case "frogged": return .red
        case "hibernating": return .orange
        default: return .gray
        }
    }

    private func formatWeight(_ weight: String) -> String {
        switch weight {
        case "super_bulky": return "Super bulky"
        case "dk": return "DK"
        case "unknown": return "Other"
        default: return weight.capitalized
        }
    }

    private func formatSkeins(_ skeins: Double) -> String {
        skeins == skeins.rounded() ? String(Int(skeins)) : String(format: "%.1f", skeins)
    }

    private func formatCraftingTime(_ minutes: Int) -> String {
        if minutes < 60 { return "\(minutes)m" }
        let hours = minutes / 60
        let mins = minutes % 60
        if mins == 0 { return "\(hours)h" }
        return "\(hours)h \(mins)m"
    }

    private func needleIcon(_ type: String) -> String {
        switch type {
        case "circular": return "arrow.triangle.2.circlepath"
        case "dpn": return "line.3.horizontal"
        case "straight": return "line.diagonal"
        case "crochet_hook": return "pencil.and.outline"
        default: return "line.diagonal"
        }
    }

    private func needleLabel(_ type: String) -> String {
        switch type {
        case "circular": return "Circular"
        case "dpn": return "DPN"
        case "straight": return "Straight"
        case "crochet_hook": return "Hooks"
        default: return type.capitalized
        }
    }

    private func starIcon(for star: Int, rating: Double) -> String {
        if Double(star) <= rating { return "star.fill" }
        if Double(star) - 0.5 <= rating { return "star.leadinghalf.filled" }
        return "star"
    }

    private func activityIcon(_ type: String) -> String {
        switch type {
        case "project_completed": return "checkmark.circle.fill"
        case "project_started": return "plus.circle.fill"
        case "project_frogged": return "scissors"
        case "row_milestone": return "flame.fill"
        case "pattern_queued": return "book.closed.fill"
        case "stash_added": return "basket.fill"
        case "review_posted": return "star.fill"
        case "session_logged": return "clock.fill"
        default: return "circle.fill"
        }
    }

    private func activityColor(_ type: String) -> Color {
        switch type {
        case "project_completed": return .green
        case "project_started": return Color(hex: "#4ECDC4")
        case "project_frogged": return .red
        case "row_milestone": return Color(hex: "#FF6B6B")
        case "pattern_queued", "stash_added": return Color(hex: "#4ECDC4")
        case "review_posted": return .yellow
        default: return .secondary
        }
    }

    private func activityDescription(_ event: ProfileActivityEvent) -> String {
        switch event.type {
        case "project_completed":
            return "Finished \(event.project?.title ?? "a project")"
        case "project_started":
            return "Started \(event.project?.title ?? "a project")"
        case "project_frogged":
            return "Frogged \(event.project?.title ?? "a project")"
        case "row_milestone":
            let milestone = event.metadata?["milestone"]?.intValue ?? 0
            return "Reached row \(milestone) on \(event.project?.title ?? "a project")"
        case "pattern_queued":
            return "Queued \(event.pattern?.title ?? "a pattern")"
        case "stash_added":
            let yarn = event.metadata?["yarnName"]?.stringValue ?? "yarn"
            return "Added \(yarn) to stash"
        case "review_posted":
            return "Reviewed \(event.pattern?.title ?? "a pattern")"
        case "session_logged":
            return "Logged a crafting session"
        default:
            return "Activity"
        }
    }
}

// MARK: - Heatmap Grid

struct HeatmapGrid: View {
    let days: [HeatmapDay]

    private let columns = 52
    private let rows = 7
    private let cellSize: CGFloat = 10
    private let spacing: CGFloat = 2

    var body: some View {
        let dayMap = Dictionary(uniqueKeysWithValues: days.map { ($0.date, $0.minutes) })
        let calendar = Calendar.current
        let today = Date()

        let startDate = calendar.date(byAdding: .day, value: -(columns * rows - 1), to: today)!
        let weekday = calendar.component(.weekday, from: startDate)
        let alignedStart = calendar.date(
            byAdding: .day,
            value: -(weekday - calendar.firstWeekday),
            to: startDate
        )!

        ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .top, spacing: spacing) {
                ForEach(0..<columns, id: \.self) { week in
                    VStack(spacing: spacing) {
                        ForEach(0..<rows, id: \.self) { day in
                            let date = calendar.date(
                                byAdding: .day,
                                value: week * 7 + day,
                                to: alignedStart
                            )!
                            let dateStr = ISO8601DateFormatter.dateOnly.string(from: date)
                            let minutes = dayMap[dateStr] ?? 0

                            RoundedRectangle(cornerRadius: 2)
                                .fill(heatmapColor(minutes: minutes, date: date, today: today))
                                .frame(width: cellSize, height: cellSize)
                        }
                    }
                }
            }
        }

        // Legend
        HStack(spacing: 4) {
            Spacer()
            Text("Less")
                .font(.system(size: 9))
                .foregroundStyle(.tertiary)
            ForEach([0, 15, 30, 60, 120], id: \.self) { level in
                RoundedRectangle(cornerRadius: 2)
                    .fill(heatmapLevelColor(level))
                    .frame(width: cellSize, height: cellSize)
            }
            Text("More")
                .font(.system(size: 9))
                .foregroundStyle(.tertiary)
        }
        .padding(.top, 4)
    }

    private func heatmapColor(minutes: Int, date: Date, today: Date) -> Color {
        if date > today { return Color(.systemGray6) }
        return heatmapLevelColor(minutes)
    }

    private func heatmapLevelColor(_ minutes: Int) -> Color {
        if minutes == 0 { return Color(.systemGray5) }
        if minutes < 15 { return Color(hex: "#4ECDC4").opacity(0.3) }
        if minutes < 30 { return Color(hex: "#4ECDC4").opacity(0.5) }
        if minutes < 60 { return Color(hex: "#4ECDC4").opacity(0.7) }
        return Color(hex: "#4ECDC4")
    }
}

// FlowLayout moved to Components/FlowLayout.swift

// MARK: - Edit Profile Sheet

struct EditProfileSheet: View {
    let user: ProfileUser
    let onSave: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var displayName: String = ""
    @State private var bio: String = ""
    @State private var username: String = ""
    @State private var usernameAvailable: Bool?
    @State private var usernameMessage: String?
    @State private var isCheckingUsername = false
    @State private var usernameCheckTask: Task<Void, Never>?
    @State private var selectedImage: UIImage?
    @State private var showingPhotoPicker = false
    @State private var isSaving = false
    @State private var isUploading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                // Avatar section
                Section {
                    HStack {
                        Spacer()
                        VStack(spacing: 8) {
                            ZStack(alignment: .bottomTrailing) {
                                if let selectedImage {
                                    Image(uiImage: selectedImage)
                                        .resizable()
                                        .scaledToFill()
                                        .frame(width: 88, height: 88)
                                        .clipShape(Circle())
                                } else {
                                    AsyncImage(url: URL(string: user.avatarUrl ?? "")) { image in
                                        image.resizable().scaledToFill()
                                    } placeholder: {
                                        Image(systemName: "person.circle.fill")
                                            .resizable()
                                            .foregroundStyle(.gray.opacity(0.3))
                                    }
                                    .frame(width: 88, height: 88)
                                    .clipShape(Circle())
                                }

                                Image(systemName: "camera.circle.fill")
                                    .font(.title3)
                                    .foregroundStyle(.white, Color(hex: "#FF6B6B"))
                                    .offset(x: 2, y: 2)
                            }
                            .onTapGesture { showingPhotoPicker = true }

                            Button("Change photo") { showingPhotoPicker = true }
                                .font(.subheadline)
                                .foregroundStyle(Color(hex: "#FF6B6B"))

                            if isUploading {
                                ProgressView()
                                    .controlSize(.small)
                            }
                        }
                        Spacer()
                    }
                }
                .listRowBackground(Color.clear)

                Section {
                    HStack {
                        Text("@")
                            .foregroundStyle(.secondary)
                        TextField("username", text: $username)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .onChange(of: username) {
                                let sanitized = username.lowercased()
                                    .replacingOccurrences(of: " ", with: "_")
                                if sanitized != username {
                                    username = sanitized
                                }
                                checkUsernameAvailability()
                            }
                        if isCheckingUsername {
                            ProgressView().controlSize(.small)
                        } else if let available = usernameAvailable {
                            Image(systemName: available ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .foregroundStyle(available ? Color(hex: "#4ECDC4") : Color(hex: "#FF6B6B"))
                        }
                    }
                    if let message = usernameMessage {
                        Text(message)
                            .font(.caption)
                            .foregroundStyle(usernameAvailable == true ? Color(hex: "#4ECDC4") : .red)
                    }
                } header: {
                    Text("Username")
                } footer: {
                    Text("3-20 characters · letters, numbers, underscores · can be changed once every 30 days")
                }

                Section("Display name") {
                    TextField("Display name", text: $displayName)
                }

                Section("Bio") {
                    TextField("Tell us about yourself", text: $bio, axis: .vertical)
                        .lineLimit(3...6)
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Edit profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task { await save() }
                    }
                    .disabled(isSaving || isUploading || usernameAvailable == false)
                    .fontWeight(.semibold)
                }
            }
            .sheet(isPresented: $showingPhotoPicker) {
                ImagePicker(image: $selectedImage)
            }
        }
        .onAppear {
            displayName = user.displayName ?? ""
            bio = user.bio ?? ""
            username = user.username
        }
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        do {
            // Upload avatar first if changed
            if let image = selectedImage {
                isUploading = true
                defer { isUploading = false }

                guard let jpegData = image.jpegData(compressionQuality: 0.8) else {
                    errorMessage = "Could not process image"
                    return
                }

                struct AvatarResponse: Decodable { let avatarUrl: String }
                let _: APIResponse<AvatarResponse> = try await APIClient.shared.upload(
                    "/users/me/avatar",
                    imageData: jpegData
                )
            }

            // Update username if changed
            if username != user.username {
                struct UsernameBody: Encodable { let username: String }
                let _: APIResponse<User> = try await APIClient.shared.patch(
                    "/users/me/username",
                    body: UsernameBody(username: username)
                )
            }

            // Update text fields
            struct UpdateBody: Encodable {
                let display_name: String
                let bio: String
            }
            let _: APIResponse<User> = try await APIClient.shared.patch(
                "/users/me",
                body: UpdateBody(display_name: displayName, bio: bio)
            )

            onSave()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func checkUsernameAvailability() {
        usernameCheckTask?.cancel()
        usernameAvailable = nil
        usernameMessage = nil

        let input = username
        if input == user.username {
            return // no change, no need to check
        }

        guard input.count >= 3 else {
            if !input.isEmpty {
                usernameMessage = "Too short"
                usernameAvailable = false
            }
            return
        }
        guard input.count <= 20 else {
            usernameMessage = "Too long"
            usernameAvailable = false
            return
        }

        isCheckingUsername = true
        usernameCheckTask = Task {
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }

            do {
                struct CheckResponse: Decodable {
                    let username: String
                    let available: Bool
                    let reason: String?
                }
                let response: APIResponse<CheckResponse> = try await APIClient.shared.get(
                    "/users/me/username/check?q=\(input)"
                )
                guard !Task.isCancelled else { return }
                await MainActor.run {
                    isCheckingUsername = false
                    usernameAvailable = response.data.available
                    usernameMessage = response.data.available ? "Available" : response.data.reason
                }
            } catch {
                guard !Task.isCancelled else { return }
                await MainActor.run {
                    isCheckingUsername = false
                    usernameAvailable = false
                    usernameMessage = "Could not check availability"
                }
            }
        }
    }
}

// MARK: - Image Picker (UIKit bridge)

struct ImagePicker: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        picker.allowsEditing = true
        picker.sourceType = .photoLibrary
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: ImagePicker

        init(_ parent: ImagePicker) { self.parent = parent }

        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            if let edited = info[.editedImage] as? UIImage {
                parent.image = edited
            } else if let original = info[.originalImage] as? UIImage {
                parent.image = original
            }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}

// MARK: - Date Formatter

extension ISO8601DateFormatter {
    static let dateOnly: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withFullDate]
        return f
    }()
}
