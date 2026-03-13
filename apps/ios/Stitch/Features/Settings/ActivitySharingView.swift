import SwiftUI

// MARK: - Activity Sharing Preferences

struct ActivitySharingPreference: Identifiable {
    let key: String
    let label: String
    let icon: String
    let color: Color
    var enabled: Bool

    var id: String { key }
}

@Observable
final class ActivitySharingViewModel {
    var preferences: [ActivitySharingPreference] = []
    var isLoading = false
    var error: String?

    private static let activityTypes: [(key: String, label: String, icon: String, color: Color)] = [
        ("project_started", "Started a project", "plus.circle.fill", Color(hex: "#4ECDC4")),
        ("project_completed", "Finished a project", "checkmark.circle.fill", .green),
        ("project_frogged", "Frogged a project", "scissors", .red),
        ("stash_added", "Added to stash", "basket.fill", Color(hex: "#4ECDC4")),
        ("row_milestone", "Row milestones", "chart.bar.fill", Color(hex: "#FF6B6B")),
        ("pattern_queued", "Queued a pattern", "book.closed.fill", Color(hex: "#4ECDC4")),
        ("pattern_saved", "Saved a pattern", "bookmark.fill", .orange),
        ("review_posted", "Posted a review", "star.fill", .yellow),
        ("session_logged", "Logged a session", "timer", .purple),
    ]

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            struct Response: Decodable { let preferences: [String: Bool] }
            let response: APIResponse<Response> = try await APIClient.shared.get("/users/me/activity-sharing")
            let prefs = response.data.preferences
            preferences = Self.activityTypes.map { type in
                ActivitySharingPreference(
                    key: type.key,
                    label: type.label,
                    icon: type.icon,
                    color: type.color,
                    enabled: prefs[type.key] ?? true
                )
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func toggle(_ preference: ActivitySharingPreference) async {
        guard let idx = preferences.firstIndex(where: { $0.key == preference.key }) else { return }

        // Optimistic toggle
        preferences[idx].enabled.toggle()

        // Build full preferences map to send
        var prefsMap: [String: Bool] = [:]
        for pref in preferences {
            prefsMap[pref.key] = pref.enabled
        }

        struct Body: Encodable { let preferences: [String: Bool] }
        struct Response: Decodable { let preferences: [String: Bool] }

        do {
            let response: APIResponse<Response> = try await APIClient.shared.patch(
                "/users/me/activity-sharing",
                body: Body(preferences: prefsMap)
            )
            // Sync with server response
            let serverPrefs = response.data.preferences
            for i in preferences.indices {
                preferences[i].enabled = serverPrefs[preferences[i].key] ?? true
            }
        } catch {
            // Revert on failure
            preferences[idx].enabled.toggle()
            self.error = error.localizedDescription
        }
    }
}

// MARK: - View

struct ActivitySharingView: View {
    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = ActivitySharingViewModel()

    var body: some View {
        List {
            Section {
                Text("Choose which activity your friends can see in their feed. Posts are always visible to followers.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))
            }

            if viewModel.isLoading {
                Section {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                }
            } else {
                Section("Activity types") {
                    ForEach(viewModel.preferences) { pref in
                        HStack(spacing: 12) {
                            Image(systemName: pref.icon)
                                .font(.body)
                                .foregroundStyle(pref.color)
                                .frame(width: 24)

                            Text(pref.label)
                                .font(.subheadline)

                            Spacer()

                            Toggle("", isOn: Binding(
                                get: { pref.enabled },
                                set: { _ in
                                    Task { await viewModel.toggle(pref) }
                                }
                            ))
                            .tint(theme.primary)
                            .labelsHidden()
                        }
                    }
                }
            }
        }
        .navigationTitle("Activity sharing")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.load() }
        .alert("Error", isPresented: .init(
            get: { viewModel.error != nil },
            set: { if !$0 { viewModel.error = nil } }
        )) {
            Button("OK") { viewModel.error = nil }
        } message: {
            Text(viewModel.error ?? "")
        }
    }
}
