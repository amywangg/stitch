import SwiftUI

struct NotificationsView: View {
    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = NotificationsViewModel()

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.notifications.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if viewModel.notifications.isEmpty {
                ContentUnavailableView(
                    "No notifications",
                    systemImage: "bell",
                    description: Text("You'll see activity here when people interact with your projects.")
                )
            } else {
                List(viewModel.notifications) { notification in
                    Button {
                        if !notification.read {
                            Task { await viewModel.markRead(notification.id) }
                        }
                    } label: {
                        notificationRow(notification)
                    }
                    .buttonStyle(.plain)
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("Notifications")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Mark all read") {
                    Task { await viewModel.markAllRead() }
                }
                .font(.subheadline)
            }
        }
        .task { await viewModel.load() }
    }

    private func notificationRow(_ notification: StitchNotification) -> some View {
        HStack(spacing: 10) {
            if let sender = notification.sender {
                AvatarImage(url: sender.avatarUrl, size: 36)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(notificationText(notification))
                    .font(.subheadline)
                    .lineLimit(2)

                Text(notification.createdAt, style: .relative)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if !notification.read {
                Circle()
                    .fill(theme.primary)
                    .frame(width: 8, height: 8)
            }
        }
        .padding(.vertical, 4)
        .opacity(notification.read ? 0.7 : 1.0)
    }

    private func notificationText(_ notification: StitchNotification) -> AttributedString {
        let senderName = notification.sender?.displayName ?? notification.sender?.username ?? "Someone"
        var text = AttributedString(senderName)
        text.font = .subheadline.weight(.semibold)

        switch notification.type {
        case "follow":
            text.append(AttributedString(" started following you"))
        case "like":
            let target = notification.resourceType == "activity_event" ? "activity" : "post"
            text.append(AttributedString(" liked your \(target)"))
        case "comment":
            let target = notification.resourceType == "activity_event" ? "activity" : "post"
            text.append(AttributedString(" commented on your \(target)"))
        case "mention":
            text.append(AttributedString(" mentioned you"))
        case "new_post":
            text.append(AttributedString(" shared a new post"))
        case "pattern_sold":
            if let message = notification.message {
                return AttributedString(message)
            }
            text.append(AttributedString(" purchased your pattern"))
        default:
            if let message = notification.message {
                return AttributedString(message)
            }
            text.append(AttributedString(" interacted with you"))
        }

        return text
    }
}
