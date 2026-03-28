import SwiftUI

// MARK: - Sync State

private enum SyncState {
    case idle
    case syncing
    case success(imported: Int)
    case partialFailure(imported: Int, errors: String)
    case failed(message: String)
}

// MARK: - View

struct RavelerySyncView: View {
    @Environment(ThemeManager.self) private var theme
    @State private var status: RavelryConnection?
    @State private var syncState: SyncState = .idle
    @State private var currentPhase: String?
    @State private var progress: Double = 0

    @Environment(\.dismiss) private var dismiss

    private let phases: [(key: String, label: String, icon: String)] = [
        ("profile", "Profile", "person.fill"),
        ("projects", "Projects", "folder.fill"),
        ("patterns", "Patterns", "doc.text.fill"),
        ("pdfs", "Downloading PDFs", "arrow.down.doc.fill"),
        ("queue", "Queue", "list.bullet"),
        ("stash", "Stash", "basket.fill"),
        ("push_back", "Sync to Ravelry", "arrow.up.circle.fill"),
        ("photos", "Uploading photos", "photo.fill"),
    ]

    private var canDismiss: Bool {
        switch syncState {
        case .idle, .syncing: return false
        default: return true
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            headerSection
                .padding(.top, 60)
                .padding(.horizontal, 32)

            progressSection
                .padding(.horizontal, 32)
                .padding(.top, 24)

            phaseList

            actionButtons
        }
        .background(Color(.systemGroupedBackground))
        .interactiveDismissDisabled(!canDismiss)
        .task { await startSync() }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: 12) {
            Group {
                switch syncState {
                case .idle, .syncing:
                    ProgressView()
                        .scaleEffect(1.5)
                        .frame(height: 56)
                case .success:
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 56))
                        .foregroundStyle(.green)
                case .partialFailure:
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 56))
                        .foregroundStyle(.orange)
                case .failed:
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 56))
                        .foregroundStyle(.red)
                }
            }

            Text(headerTitle)
                .font(.title2.bold())

            Text(headerSubtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    private var headerTitle: String {
        switch syncState {
        case .idle: return "Preparing sync..."
        case .syncing:
            if let phase = currentPhase, let label = phases.first(where: { $0.key == phase })?.label {
                return "Syncing \(label)..."
            }
            return "Syncing..."
        case .success: return "Sync complete"
        case .partialFailure: return "Sync incomplete"
        case .failed: return "Sync failed"
        }
    }

    private var headerSubtitle: String {
        switch syncState {
        case .idle: return "Setting up Ravelry connection"
        case .syncing: return "Syncing your projects, patterns, stash, and more"
        case .success(let count): return "Synced \(count) item\(count == 1 ? "" : "s") with Ravelry"
        case .partialFailure(let count, _): return "Synced \(count) item\(count == 1 ? "" : "s"), but some couldn't be synced"
        case .failed(let msg): return msg
        }
    }

    // MARK: - Progress

    private var progressSection: some View {
        VStack(spacing: 8) {
            ProgressView(value: progress, total: 1.0)
                .tint(progressTint)
                .scaleEffect(y: 2)

            if case .syncing = syncState {
                Text("\(Int(progress * 100))%")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var progressTint: Color {
        switch syncState {
        case .success: return .green
        case .failed: return .red
        case .partialFailure: return .orange
        default: return theme.primary
        }
    }

    // MARK: - Phase List

    private var phaseList: some View {
        List {
            ForEach(phases, id: \.key) { phase in
                HStack(spacing: 12) {
                    Image(systemName: phase.icon)
                        .frame(width: 24)
                        .foregroundStyle(colorForPhase(phase.key))

                    Text(phase.label)
                        .foregroundStyle(colorForPhase(phase.key))

                    Spacer()

                    trailingForPhase(phase.key)
                }
                .padding(.vertical, 4)
            }

            // Stats section on success/partial
            if case .success = syncState, let stats = status?.importStats {
                syncStatsSections(stats)
            }

            if case .partialFailure = syncState, let stats = status?.importStats {
                syncStatsSections(stats)
            }
        }
        .listStyle(.insetGrouped)
    }

    private func phaseIndex(_ key: String) -> Int? {
        phases.firstIndex(where: { $0.key == key })
    }

    private var currentPhaseIndex: Int? {
        guard let current = currentPhase else { return nil }
        return phaseIndex(current)
    }

    private func colorForPhase(_ key: String) -> Color {
        guard let myIdx = phaseIndex(key) else { return .secondary.opacity(0.5) }

        switch syncState {
        case .success, .partialFailure: return .primary
        case .failed: return .secondary.opacity(0.5)
        case .syncing:
            guard let curIdx = currentPhaseIndex else { return .secondary.opacity(0.5) }
            if myIdx < curIdx { return .primary }
            if myIdx == curIdx { return theme.primary }
            return .secondary.opacity(0.5)
        default: return .secondary.opacity(0.5)
        }
    }

    @ViewBuilder
    private func trailingForPhase(_ key: String) -> some View {
        let myIdx = phaseIndex(key) ?? 0

        switch syncState {
        case .success:
            Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
        case .partialFailure:
            Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
        case .failed:
            Image(systemName: "minus.circle").foregroundStyle(.secondary.opacity(0.3))
        case .syncing:
            if let curIdx = currentPhaseIndex {
                if myIdx < curIdx {
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                } else if myIdx == curIdx {
                    ProgressView().scaleEffect(0.7)
                } else {
                    Image(systemName: "circle").foregroundStyle(.secondary.opacity(0.3))
                }
            } else {
                Image(systemName: "circle").foregroundStyle(.secondary.opacity(0.3))
            }
        default:
            Image(systemName: "circle").foregroundStyle(.secondary.opacity(0.3))
        }
    }

    @ViewBuilder
    private func syncStatsSections(_ stats: RavelryConnection.ImportStats) -> some View {
        let projTotal = (stats.projects?.imported ?? 0) + (stats.projects?.updated ?? 0)
        let patTotal = (stats.patterns?.imported ?? 0) + (stats.patterns?.updated ?? 0)
        let pdfsDownloaded = stats.patterns?.pdfsDownloaded ?? 0
        let queueTotal = (stats.queue?.imported ?? 0) + (stats.queue?.updated ?? 0)
        let stashTotal = (stats.stash?.imported ?? 0) + (stats.stash?.updated ?? 0)
        let hasSynced = projTotal + patTotal + queueTotal + stashTotal + pdfsDownloaded > 0

        let pushCreated = stats.pushBack?.projectsCreated ?? 0
        let pushUpdated = stats.pushBack?.projectsUpdated ?? 0
        let pushPhotos = stats.pushBack?.photosUploaded ?? 0
        let hasPush = pushCreated + pushUpdated + pushPhotos > 0

        if hasSynced {
            Section("Synced from Ravelry") {
                if projTotal > 0 { statRow("Projects", projTotal, stats.projects?.total) }
                if patTotal > 0 { statRow("Patterns", patTotal, nil) }
                if pdfsDownloaded > 0 { statRow("Pattern PDFs", pdfsDownloaded, nil) }
                if queueTotal > 0 { statRow("Queue", queueTotal, nil) }
                if stashTotal > 0 { statRow("Stash", stashTotal, nil) }
            }
        }

        if hasPush {
            Section("Pushed to Ravelry") {
                if pushCreated > 0 {
                    statRow("Projects created", pushCreated, nil)
                }
                if pushUpdated > 0 {
                    statRow("Projects updated", pushUpdated, nil)
                }
                if pushPhotos > 0 {
                    statRow("Photos uploaded", pushPhotos, nil)
                }
            }
        }

        if !hasSynced && !hasPush {
            Section("Summary") {
                Text("Everything is already in sync")
                    .foregroundStyle(.secondary)
            }
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
                    Text("\(count) of \(total)").foregroundStyle(.secondary)
                } else {
                    Text("\(count)").foregroundStyle(.secondary)
                }
            }
        }
    }

    // MARK: - Action Buttons

    @ViewBuilder
    private var actionButtons: some View {
        if canDismiss {
            VStack(spacing: 10) {
                if isFailedState { retryButton }
                dismissButton
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)
        }
    }

    private var isFailedState: Bool {
        if case .failed = syncState { return true }
        return false
    }

    private var retryButton: some View {
        Button {
            syncState = .idle
            progress = 0
            currentPhase = nil
            Task { await startSync() }
        } label: {
            Text("Try again")
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color(hex: "#FF6B6B"))
                .foregroundStyle(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private var isSuccessState: Bool {
        if case .success = syncState { return true }
        return false
    }

    private var dismissButton: some View {
        Button { dismiss() } label: {
            Text(isSuccessState ? "Done" : "Close")
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(isSuccessState ? Color(hex: "#FF6B6B") : Color(.secondarySystemGroupedBackground))
                .foregroundStyle(isSuccessState ? Color.white : Color.primary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    // MARK: - Networking

    private func startSync() async {
        syncState = .syncing

        // First, check current status — maybe a previous sync is stuck
        do {
            let statusResponse: APIResponse<RavelryConnection> = try await APIClient.shared.get(
                "/integrations/ravelry/status"
            )
            status = statusResponse.data

            // If already importing, just poll (don't trigger another)
            if statusResponse.data.importStatus == "importing" {
                await pollUntilDone()
                return
            }

            // If previous error state, the server already reset — proceed
        } catch {
            syncState = .failed(message: "Couldn't check sync status. Check your connection.")
            return
        }

        // Fire sync in background — don't await the response (it takes minutes)
        // The server sets import_status which we poll via the status endpoint
        Task.detached {
            let _ = try? await APIClient.shared.post(
                "/integrations/ravelry/sync",
                body: [:] as [String: Any]
            )
        }

        // Give the server a moment to start the sync
        try? await Task.sleep(for: .milliseconds(1000))

        await pollUntilDone()
    }

    private func pollUntilDone() async {
        var maxPolls = 200 // ~5 minutes at 1.5s intervals

        while maxPolls > 0 {
            try? await Task.sleep(for: .milliseconds(1500))
            maxPolls -= 1

            do {
                let response: APIResponse<RavelryConnection> = try await APIClient.shared.get(
                    "/integrations/ravelry/status"
                )
                await MainActor.run {
                    status = response.data
                    currentPhase = response.data.importStats?.currentPhase

                    // Update progress
                    if let phase = currentPhase, let idx = phases.firstIndex(where: { $0.key == phase }) {
                        progress = Double(idx + 1) / Double(phases.count)
                    }
                }

                let importStatus = response.data.importStatus

                if importStatus == "done" {
                    let total = totalImported(from: response.data)
                    let hasErrors = response.data.importError != nil && !response.data.importError!.isEmpty

                    // Trigger background photo processing (fire and forget)
                    Task.detached {
                        struct PhotoResult: Decodable { let processed: Int; let remaining: Int }
                        // Process in batches until no remaining
                        for _ in 0..<5 {
                            let result = try? await APIClient.shared.post(
                                "/integrations/ravelry/sync/photos",
                                body: [:] as [String: String]
                            ) as APIResponse<PhotoResult>
                            if (result?.data.remaining ?? 0) == 0 { break }
                            try? await Task.sleep(for: .seconds(2))
                        }
                    }

                    await MainActor.run {
                        progress = 1.0
                        if hasErrors && total > 0 {
                            syncState = .partialFailure(imported: total, errors: response.data.importError ?? "")
                        } else if hasErrors {
                            syncState = .failed(message: "Sync completed but all items failed to import.")
                        } else {
                            syncState = .success(imported: total)
                        }
                    }
                    return
                }

                if importStatus == "error" {
                    let importError = response.data.importError ?? ""
                    let total = totalImported(from: response.data)

                    await MainActor.run {
                        progress = 1.0
                        if total > 0 {
                            syncState = .partialFailure(imported: total, errors: importError)
                        } else {
                            syncState = .failed(message: importError.isEmpty ? "Sync failed. Please try again." : importError)
                        }
                    }
                    return
                }

                if importStatus == "idle" || importStatus == nil {
                    // Server hasn't started yet or reset — keep waiting briefly
                    continue
                }

                // "importing" — keep polling
            } catch is CancellationError {
                return
            } catch {
                await MainActor.run {
                    syncState = .failed(message: "Lost connection during sync. Your imported data is safe.")
                }
                return
            }
        }

        // Timed out
        await MainActor.run {
            let total = totalImported(from: status)
            if total > 0 {
                syncState = .partialFailure(imported: total, errors: "Sync timed out")
            } else {
                syncState = .failed(message: "Sync timed out. Please try again.")
            }
        }
    }

    private func totalImported(from conn: RavelryConnection?) -> Int {
        guard let s = conn?.importStats else { return 0 }
        var count = 0
        count += s.projects?.imported ?? 0
        count += s.projects?.updated ?? 0
        count += s.patterns?.imported ?? 0
        count += s.patterns?.updated ?? 0
        count += (s.patterns?.pdfsDownloaded ?? 0)
        count += s.queue?.imported ?? 0
        count += s.queue?.updated ?? 0
        count += s.stash?.imported ?? 0
        count += s.stash?.updated ?? 0
        return count
    }
}
