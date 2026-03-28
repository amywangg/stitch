import SwiftUI

struct ActivityCard: View {
    let activity: FeedActivity
    let onLike: () -> Void
    let onComment: () -> Void
    @Environment(ThemeManager.self) private var theme

    private var eventConfig: (icon: String, color: Color, verb: String) {
        switch activity.type {
        case "project_completed":
            return ("checkmark.circle.fill", Color.green, "finished")
        case "project_started":
            return ("plus.circle.fill", theme.primary, "started")
        case "project_frogged":
            return ("scissors", Color.red, "frogged")
        case "row_milestone":
            let milestone = activity.metadata?["milestone"]?.intValue ?? 0
            return ("chart.bar.fill", theme.primary, "reached row \(milestone) on")
        case "pattern_queued":
            return ("book.closed.fill", theme.primary, "queued")
        case "stash_added":
            let yarnName = activity.metadata?["yarnName"]?.stringValue ?? "yarn"
            return ("basket.fill", theme.primary, "added \(yarnName) to stash")
        case "review_posted":
            return ("star.fill", Color.yellow, "reviewed")
        default:
            return ("circle.fill", .secondary, "did something with")
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Author row
            HStack(spacing: 8) {
                AvatarImage(url: activity.user.avatarUrl, size: 36)

                VStack(alignment: .leading, spacing: 2) {
                    Text(activity.user.displayName ?? activity.user.username)
                        .font(.subheadline.weight(.semibold))
                    Text(activity.createdAt, style: .relative)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Image(systemName: eventConfig.icon)
                    .foregroundStyle(eventConfig.color)
                    .font(.title3)
            }

            // Event content
            eventContent

            // Interaction bar
            HStack(spacing: 16) {
                Button(action: onLike) {
                    Label(
                        "\(activity.count?.likes ?? 0)",
                        systemImage: activity.isLiked ? "heart.fill" : "heart"
                    )
                    .foregroundStyle(activity.isLiked ? theme.primary : .secondary)
                }
                .buttonStyle(.plain)

                Button(action: onComment) {
                    Label(
                        "\(activity.count?.comments ?? 0)",
                        systemImage: "bubble.right"
                    )
                    .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)

                Spacer()
            }
            .font(.subheadline)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    @ViewBuilder
    private var eventContent: some View {
        switch activity.type {
        case "project_completed":
            projectHeroCard(isCompletion: true)
        case "project_started", "project_frogged":
            projectCompactCard
        case "row_milestone":
            rowMilestoneCard
        case "pattern_queued":
            patternCompactCard
        case "stash_added":
            stashCard
        default:
            Text(eventConfig.verb)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    @ViewBuilder
    private func projectHeroCard(isCompletion: Bool) -> some View {
        if let project = activity.project {
            VStack(alignment: .leading, spacing: 8) {
                // Project photo (hero size for completions)
                if let photo = project.photos?.first {
                    AsyncImage(url: URL(string: photo.url)) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        Color.gray.opacity(0.2)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: isCompletion ? 200 : 120)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                HStack {
                    if isCompletion {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                    }
                    Text("\(eventConfig.verb) ")
                        .foregroundStyle(.secondary)
                    + Text(project.title)
                        .fontWeight(.semibold)
                }
                .font(.subheadline)
            }
        }
    }

    @ViewBuilder
    private var projectCompactCard: some View {
        if let project = activity.project {
            HStack(spacing: 10) {
                if let photo = project.photos?.first {
                    AsyncImage(url: URL(string: photo.url)) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        Color.gray.opacity(0.2)
                    }
                    .frame(width: 48, height: 48)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                (Text("\(eventConfig.verb) ")
                    .foregroundStyle(.secondary)
                + Text(project.title)
                    .fontWeight(.semibold))
                .font(.subheadline)
            }
        }
    }

    @ViewBuilder
    private var rowMilestoneCard: some View {
        if let project = activity.project {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 10) {
                    if let photo = project.photos?.first {
                        AsyncImage(url: URL(string: photo.url)) { image in
                            image.resizable().scaledToFill()
                        } placeholder: {
                            Color.gray.opacity(0.2)
                        }
                        .frame(width: 48, height: 48)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        (Text("\(eventConfig.verb) ")
                            .foregroundStyle(.secondary)
                        + Text(project.title)
                            .fontWeight(.semibold))
                        .font(.subheadline)
                    }
                }

                // Milestone progress indicator
                let milestone = activity.metadata?["milestone"]?.intValue ?? 0
                HStack(spacing: 4) {
                    Image(systemName: "flame.fill")
                        .foregroundStyle(theme.primary)
                        .font(.caption)
                    Text("Row \(milestone)")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(theme.primary)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(theme.primary.opacity(0.1))
                .clipShape(Capsule())
            }
        }
    }

    @ViewBuilder
    private var patternCompactCard: some View {
        if let pattern = activity.pattern {
            HStack(spacing: 10) {
                if let url = pattern.coverImageUrl {
                    AsyncImage(url: URL(string: url)) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        Color.gray.opacity(0.2)
                    }
                    .frame(width: 40, height: 60)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                }

                VStack(alignment: .leading, spacing: 2) {
                    (Text("queued ")
                        .foregroundStyle(.secondary)
                    + Text(pattern.title)
                        .fontWeight(.semibold))
                    .font(.subheadline)

                    if let designer = pattern.designerName {
                        Text("by \(designer)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var stashCard: some View {
        let yarnName = activity.metadata?["yarnName"]?.stringValue ?? "yarn"
        HStack(spacing: 8) {
            Image(systemName: "basket.fill")
                .foregroundStyle(theme.primary)
                .font(.title3)
            (Text("added ")
                .foregroundStyle(.secondary)
            + Text(yarnName)
                .fontWeight(.semibold)
            + Text(" to stash")
                .foregroundStyle(.secondary))
            .font(.subheadline)
        }
    }
}
