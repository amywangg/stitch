import SwiftUI

struct ProfileView: View {
    @Environment(ThemeManager.self) private var theme
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
                            ProfileHeader(
                                user: summary.user,
                                stats: summary.stats,
                                onEditProfile: { showingEditProfile = true }
                            )
                            .sheet(isPresented: $showingEditProfile) {
                                EditProfileSheet(user: summary.user) {
                                    Task { await viewModel.load() }
                                }
                            }

                            ProfileStatsGrid(stats: summary.stats)

                            // Badges
                            ProfileBadgesSection(badges: computeBadges(
                                stats: summary.stats,
                                user: summary.user,
                                ravelry: summary.ravelry,
                                heatmap: summary.heatmap
                            ))

                            craftingHeatmap(summary.heatmap, stats: summary.stats)
                            ProfileProjectsGrid(projects: summary.recentProjects, stats: summary.stats)
                            ProfileQueueSection(items: summary.queuePreview, count: summary.stats.queueItems)
                            ProfileFavoritesSection(patterns: summary.savedPatternsPreview, count: summary.stats.savedPatterns)
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
                case .projectDetail(let id):
                    ProjectDetailView(projectId: id)
                case .patternDetail(let id):
                    PatternDetailView(patternId: id)
                case .findFriends:
                    FindFriendsView()
                case .followersList:
                    FollowListView(type: .followers)
                case .followingList:
                    FollowListView(type: .following)
                case .notifications:
                    NotificationsView()
                case .stash:
                    StashView()
                case .stashItemDetail(let id):
                    StashItemDetailView(itemId: id)
                case .needles:
                    NeedlesView()
                case .addFromCatalog:
                    AddFromCatalogView()
                case .toolSetDetail(let id):
                    ToolSetDetailView(setId: id)
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

    // ─── Crafting Heatmap ────────────────────────────────────────────────────

    private func craftingHeatmap(_ heatmap: [HeatmapDay], stats: ProfileStats) -> some View {
        profileSection(title: "Crafting activity", trailing: {
            if stats.totalCraftingMinutesThisYear > 0 {
                Text(formatCraftingTime(stats.totalCraftingMinutesThisYear) + " this year")
                    .font(.caption)
                    .foregroundStyle(theme.primary)
            }
        }) {
            if heatmap.isEmpty {
                ProfileEmptyState(message: "No crafting sessions logged yet")
            } else {
                HeatmapGrid(days: heatmap)
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
                ProfileEmptyState(message: "Stash is empty")
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
                                    .fill(theme.primary.opacity(0.7))
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
                ProfileEmptyState(message: "No needles or hooks added")
            } else {
                HStack(spacing: 16) {
                    ForEach(Array(breakdown.sorted(by: { $0.value > $1.value })), id: \.key) { type, qty in
                        VStack(spacing: 4) {
                            Image(systemName: needleIcon(type))
                                .font(.title3)
                                .foregroundStyle(theme.primary)
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
                ProfileEmptyState(message: "No reviews yet")
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
                            .foregroundStyle(theme.primary)
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
                    .foregroundStyle(wouldMake ? theme.primary : .secondary)
                }
            }

            Spacer()
        }
    }

    // ─── Recent Activity ─────────────────────────────────────────────────────

    private func recentActivitySection(_ events: [ProfileActivityEvent]) -> some View {
        profileSection(title: "Recent activity") {
            if events.isEmpty {
                ProfileEmptyState(message: "No recent activity")
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

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private func formatWeight(_ weight: String) -> String {
        switch weight {
        case "super_bulky": return "Super bulky"
        case "dk": return "DK"
        case "unknown": return "Other"
        default: return weight.capitalized
        }
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
        case "project_started": return theme.primary
        case "project_frogged": return .red
        case "row_milestone": return theme.primary
        case "pattern_queued", "stash_added": return theme.primary
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

    @Environment(ThemeManager.self) private var theme
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
        .defaultScrollAnchor(.trailing)

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
        if minutes < 15 { return theme.primary.opacity(0.3) }
        if minutes < 30 { return theme.primary.opacity(0.5) }
        if minutes < 60 { return theme.primary.opacity(0.7) }
        return theme.primary
    }
}

// FlowLayout moved to Components/FlowLayout.swift

// MARK: - Edit Profile Sheet

struct EditProfileSheet: View {
    let user: ProfileUser
    let onSave: () -> Void

    @Environment(ThemeManager.self) private var theme
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
                                    .foregroundStyle(.white, theme.primary)
                                    .offset(x: 2, y: 2)
                            }
                            .onTapGesture { showingPhotoPicker = true }

                            Button("Change photo") { showingPhotoPicker = true }
                                .font(.subheadline)
                                .foregroundStyle(theme.primary)

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
                                .foregroundStyle(available ? theme.primary : theme.primary)
                        }
                    }
                    if let message = usernameMessage {
                        Text(message)
                            .font(.caption)
                            .foregroundStyle(usernameAvailable == true ? theme.primary : .red)
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
