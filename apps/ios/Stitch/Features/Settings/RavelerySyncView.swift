import SwiftUI

/// Full-screen sync progress view shown after connecting Ravelry.
/// Triggers sync automatically, polls status, and shows animated progress.
struct RavelerySyncView: View {
    @Environment(ThemeManager.self) private var theme
    @State private var status: RavelryConnection?
    @State private var syncTriggered = false
    @State private var syncStartedOnServer = false
    @State private var error: String?
    @State private var pollTimer: Timer?

    @Environment(\.dismiss) private var dismiss

    private let phases: [(key: String, label: String, icon: String)] = [
        ("profile", "Profile", "person.fill"),
        ("projects", "Projects", "folder.fill"),
        ("patterns", "Patterns", "doc.text.fill"),
        ("queue", "Queue", "list.bullet"),
        ("stash", "Stash", "basket.fill"),
        ("needles", "Needles", "pencil.and.ruler.fill"),
    ]

    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 12) {
                if isDone {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 56))
                        .foregroundStyle(.green)
                } else if error != nil {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 56))
                        .foregroundStyle(.orange)
                } else {
                    ProgressView()
                        .scaleEffect(1.5)
                        .frame(height: 56)
                }

                Text(headerTitle)
                    .font(.title2.bold())

                Text(headerSubtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.top, 60)
            .padding(.horizontal, 32)

            // Progress bar
            VStack(spacing: 8) {
                ProgressView(value: progress, total: 1.0)
                    .tint(theme.primary)
                    .scaleEffect(y: 2)

                Text("\(Int(progress * 100))%")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 32)
            .padding(.top, 32)

            // Phase list
            List {
                ForEach(phases, id: \.key) { phase in
                    HStack(spacing: 12) {
                        Image(systemName: phase.icon)
                            .frame(width: 24)
                            .foregroundStyle(phaseColor(phase.key))

                        Text(phase.label)
                            .foregroundStyle(phaseColor(phase.key))

                        Spacer()

                        phaseTrailing(phase.key)
                    }
                    .padding(.vertical, 4)
                }

                if let stats = status?.importStats, isDone {
                    Section("Imported") {
                        statRow("Projects", stats.projects?.imported, stats.projects?.total)
                        statRow("Patterns", stats.patterns?.imported, nil)
                        statRow("Queue", stats.queue?.imported, nil)
                        statRow("Stash", stats.stash?.imported, nil)
                        statRow("Needles", stats.needles?.imported, nil)
                    }
                }

                if let err = error ?? status?.importError {
                    Section {
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }
            }
            .listStyle(.insetGrouped)

            // Done button
            if isDone || error != nil {
                Button {
                    dismiss()
                } label: {
                    Text(isDone ? "Done" : "Close")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(theme.primary)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 32)
            }
        }
        .background(Color(.systemGroupedBackground))
        .interactiveDismissDisabled(!isDone && error == nil)
        .task {
            guard !syncTriggered else { return }
            await triggerSyncAndPoll()
        }
        .onDisappear {
            pollTimer?.invalidate()
        }
    }

    // MARK: - Computed

    private var isDone: Bool {
        guard syncStartedOnServer else { return false }
        return status?.importStatus == "done" || status?.importStatus == "error"
    }

    private var currentPhase: String? {
        status?.importStats?.currentPhase
    }

    private var progress: Double {
        guard let phase = currentPhase else {
            if isDone { return 1.0 }
            return 0.0
        }
        let phaseKeys = phases.map(\.key)
        guard let idx = phaseKeys.firstIndex(of: phase) else {
            if isDone { return 1.0 }
            return 0.0
        }
        // Current phase is in progress, so progress = (idx) / total
        // When done, progress = 1.0
        if isDone { return 1.0 }
        return Double(idx) / Double(phases.count)
    }

    private var headerTitle: String {
        if isDone && status?.importStatus == "error" { return "Sync Incomplete" }
        if isDone { return "Sync Complete!" }
        if let phase = currentPhase {
            let label = phases.first(where: { $0.key == phase })?.label ?? phase
            return "Syncing \(label)..."
        }
        return "Starting Sync..."
    }

    private var headerSubtitle: String {
        if isDone && status?.importStatus == "error" {
            return "Some items couldn't be imported."
        }
        if isDone {
            let total = totalImported
            return "Imported \(total) item\(total == 1 ? "" : "s") from Ravelry"
        }
        return "Importing your projects, patterns, stash, and more"
    }

    private var totalImported: Int {
        guard let s = status?.importStats else { return 0 }
        var count = 0
        count += s.projects?.imported ?? 0
        count += s.patterns?.imported ?? 0
        count += s.queue?.imported ?? 0
        count += s.stash?.imported ?? 0
        count += s.needles?.imported ?? 0
        return count
    }

    // MARK: - Phase UI helpers

    private func phaseState(_ key: String) -> PhaseState {
        let phaseKeys = phases.map(\.key)
        guard let currentIdx = phaseKeys.firstIndex(where: { $0 == currentPhase }) else {
            if isDone { return .done }
            return .pending
        }
        guard let myIdx = phaseKeys.firstIndex(of: key) else { return .pending }

        if isDone { return .done }
        if myIdx < currentIdx { return .done }
        if myIdx == currentIdx { return .active }
        return .pending
    }

    private enum PhaseState { case pending, active, done }

    private func phaseColor(_ key: String) -> Color {
        switch phaseState(key) {
        case .done: return Color.primary
        case .active: return theme.primary
        case .pending: return Color.secondary.opacity(0.5)
        }
    }

    @ViewBuilder
    private func phaseTrailing(_ key: String) -> some View {
        switch phaseState(key) {
        case .done:
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
        case .active:
            ProgressView()
                .scaleEffect(0.7)
        case .pending:
            Image(systemName: "circle")
                .foregroundStyle(.secondary.opacity(0.3))
        }
    }

    @ViewBuilder
    private func statRow(_ label: String, _ imported: Int?, _ total: Int?) -> some View {
        let count = imported ?? 0
        if count > 0 || (total ?? 0) > 0 {
            HStack {
                Text(label)
                Spacer()
                if let total, total > 0 {
                    Text("\(count) of \(total)")
                        .foregroundStyle(.secondary)
                } else {
                    Text("\(count)")
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    // MARK: - Networking

    private func triggerSyncAndPoll() async {
        syncTriggered = true

        // Fire sync in background (the route runs synchronously and may take minutes)
        Task {
            do {
                struct Empty: Decodable {}
                let _: APIResponse<Empty> = try await APIClient.shared.post(
                    "/integrations/ravelry/sync"
                )
            } catch {
                await MainActor.run {
                    self.error = "Failed to start sync: \(error.localizedDescription)"
                }
            }
        }

        // Small delay to let the sync start
        try? await Task.sleep(for: .milliseconds(500))

        // Poll status every 1.5 seconds
        while !isDone && error == nil {
            try? await Task.sleep(for: .milliseconds(1500))
            do {
                let response: APIResponse<RavelryConnection> = try await APIClient.shared.get(
                    "/integrations/ravelry/status"
                )
                self.status = response.data
                if response.data.importStatus == "importing" {
                    syncStartedOnServer = true
                }
            } catch {
                self.error = "Lost connection during sync"
                return
            }
        }
    }
}
