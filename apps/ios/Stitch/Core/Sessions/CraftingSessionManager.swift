import Foundation

@Observable
final class CraftingSessionManager {
    static let shared = CraftingSessionManager()
    private init() {
        activeSessionId = UserDefaults.standard.string(forKey: Self.sessionIdKey)
    }

    private static let sessionIdKey = "stitch_active_session_id"

    var activeSessionId: String? {
        didSet { UserDefaults.standard.set(activeSessionId, forKey: Self.sessionIdKey) }
    }
    var lastSummary: SessionSummary?
    var showSummaryToast = false

    var hasActiveSession: Bool { activeSessionId != nil }

    // MARK: - Start

    func startSession(projectId: String?) async {
        guard activeSessionId == nil else { return }

        struct Body: Encodable { let project_id: String? }
        do {
            let response: APIResponse<CraftingSession> = try await APIClient.shared.post(
                "/sessions",
                body: Body(project_id: projectId)
            )
            activeSessionId = response.data.id
        } catch {
            print("[Session] Failed to start: \(error.localizedDescription)")
        }
    }

    // MARK: - Pause / Resume

    func pauseSession() async {
        guard let sessionId = activeSessionId else { return }
        do {
            struct PauseResponse: Decodable { let action: String }
            let _: APIResponse<PauseResponse> = try await APIClient.shared.post("/sessions/\(sessionId)/pause")
        } catch {
            print("[Session] Failed to pause: \(error.localizedDescription)")
        }
    }

    func resumeSession() async {
        // Same endpoint — toggles pause/resume
        await pauseSession()
    }

    // MARK: - End

    func endSession() async {
        guard let sessionId = activeSessionId else { return }
        activeSessionId = nil

        do {
            let response: APIResponse<EndSessionResponse> = try await APIClient.shared.post("/sessions/\(sessionId)/end")
            let summary = response.data.summary
            // Only show toast if session was meaningful (> 0 rows or > 1 min)
            if summary.activeMinutes > 1 || summary.rowsWorked > 0 {
                await MainActor.run {
                    lastSummary = summary
                    showSummaryToast = true
                }
            }
        } catch {
            print("[Session] Failed to end: \(error.localizedDescription)")
        }
    }

    // MARK: - Cleanup

    func cleanupAbandonedSession() async {
        guard activeSessionId != nil else { return }
        await endSession()
    }
}
