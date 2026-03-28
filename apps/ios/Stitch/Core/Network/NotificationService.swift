import Foundation

/// Shared service that tracks unread notification count.
/// Polls every 30 seconds while the app is active.
@Observable
final class NotificationService {
    static let shared = NotificationService()
    private init() {}

    var unreadCount: Int = 0
    private var pollTask: Task<Void, Never>?

    /// Start polling for unread count. Call once from RootView.
    func startPolling() {
        stopPolling()
        pollTask = Task {
            while !Task.isCancelled {
                await fetchUnreadCount()
                try? await Task.sleep(for: .seconds(30))
            }
        }
    }

    func stopPolling() {
        pollTask?.cancel()
        pollTask = nil
    }

    /// One-shot fetch — also called after marking read.
    func fetchUnreadCount() async {
        do {
            let response: APIResponse<UnreadResponse> = try await APIClient.shared.get(
                "/social/notifications?limit=1"
            )
            await MainActor.run {
                unreadCount = response.data.unreadCount
            }
        } catch {
            // Non-critical
        }
    }

    /// Call after marking notifications read to update badge immediately.
    func clearBadge() {
        unreadCount = 0
    }
}

private struct UnreadResponse: Decodable {
    let unreadCount: Int
}
