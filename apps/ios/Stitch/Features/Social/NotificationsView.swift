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
                    notificationRow(notification)
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
                AsyncImage(url: URL(string: sender.avatarUrl ?? "")) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Color.gray.opacity(0.3)
                }
                .frame(width: 36, height: 36)
                .clipShape(Circle())
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
            text.append(AttributedString(" liked your \(notification.resourceType ?? "post")"))
        case "comment":
            text.append(AttributedString(" commented on your \(notification.resourceType ?? "post")"))
        case "mention":
            text.append(AttributedString(" mentioned you"))
        default:
            text.append(AttributedString(" interacted with you"))
        }

        return text
    }
}
