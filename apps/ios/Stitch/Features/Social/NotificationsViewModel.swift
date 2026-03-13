import Foundation

@Observable
final class NotificationsViewModel {
    var notifications: [StitchNotification] = []
    var isLoading = false
    var error: String?

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<NotificationsResponse> = try await APIClient.shared.get("/social/notifications")
            notifications = response.data.items
        } catch {
            self.error = error.localizedDescription
        }
    }

    func markAllRead() async {
        do {
            struct EmptyBody: Encodable {}
            let _: APIResponse<MessageResponse> = try await APIClient.shared.patch("/social/notifications/read", body: EmptyBody())
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
        } catch {
            self.error = error.localizedDescription
        }
    }
}

private struct MessageResponse: Decodable {
    let message: String?
}
