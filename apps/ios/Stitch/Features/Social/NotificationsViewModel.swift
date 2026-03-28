import Foundation

@Observable
final class NotificationsViewModel {
    var notifications: [StitchNotification] = []
    var isLoading = false
    var error: String?
    var unreadCount: Int = 0

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<NotificationsResponse> = try await APIClient.shared.get("/social/notifications")
            notifications = response.data.items
            unreadCount = response.data.unreadCount
            // Sync with global badge
            await MainActor.run {
                NotificationService.shared.unreadCount = response.data.unreadCount
            }
        } catch is CancellationError {
            return
        } catch {
            self.error = error.localizedDescription
        }
    }

    func markRead(_ id: String) async {
        // Optimistic
        if let idx = notifications.firstIndex(where: { $0.id == id && !$0.read }) {
            notifications[idx] = StitchNotification(
                id: notifications[idx].id,
                userId: notifications[idx].userId,
                senderId: notifications[idx].senderId,
                type: notifications[idx].type,
                resourceType: notifications[idx].resourceType,
                resourceId: notifications[idx].resourceId,
                message: notifications[idx].message,
                read: true,
                createdAt: notifications[idx].createdAt,
                sender: notifications[idx].sender
            )
            unreadCount = max(0, unreadCount - 1)
            NotificationService.shared.unreadCount = max(0, NotificationService.shared.unreadCount - 1)

            struct Body: Encodable { let ids: [String] }
            struct Result: Decodable { let message: String? }
            do {
                let _: APIResponse<Result> = try await APIClient.shared.patch(
                    "/social/notifications/read", body: Body(ids: [id])
                )
            } catch {
                // Non-critical
            }
        }
    }

    func markAllRead() async {
        // Optimistic
        for i in notifications.indices {
            notifications[i] = StitchNotification(
                id: notifications[i].id,
                userId: notifications[i].userId,
                senderId: notifications[i].senderId,
                type: notifications[i].type,
                resourceType: notifications[i].resourceType,
                resourceId: notifications[i].resourceId,
                message: notifications[i].message,
                read: true,
                createdAt: notifications[i].createdAt,
                sender: notifications[i].sender
            )
        }
        unreadCount = 0
        NotificationService.shared.clearBadge()

        do {
            struct EmptyBody: Encodable {}
            struct Result: Decodable { let message: String? }
            let _: APIResponse<Result> = try await APIClient.shared.patch("/social/notifications/read", body: EmptyBody())
        } catch {
            self.error = error.localizedDescription
            await load()
        }
    }
}
