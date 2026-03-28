import SwiftUI

// MARK: - Profile Queue Section

struct ProfileQueueSection: View {
    let items: [ProfileQueueItem]
    let count: Int

    @Environment(ThemeManager.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                ProfileSectionHeader(title: "Queue", count: count, countLabel: "want to make")
                NavigationLink(value: Route.queue) {
                    HStack(spacing: 2) {
                        Text("See all")
                            .font(.caption)
                        Image(systemName: "chevron.right")
                            .font(.caption2)
                    }
                    .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal)

            if items.isEmpty {
                ProfileEmptyState(message: "Queue is empty")
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(items) { item in
                            NavigationLink(value: Route.patternDetail(id: item.pattern.id)) {
                                ProfilePatternThumbnail(
                                    title: item.pattern.title,
                                    imageUrl: item.pattern.coverImageUrl,
                                    designer: item.pattern.designerName
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
        .padding(.vertical, 8)
    }
}

// MARK: - Profile Favorites Section

struct ProfileFavoritesSection: View {
    let patterns: [ProfileSavedPattern]
    let count: Int

    @Environment(ThemeManager.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ProfileSectionHeader(title: "Favorites", count: count, countLabel: "saved")
                .padding(.horizontal)

            if patterns.isEmpty {
                ProfileEmptyState(message: "No saved patterns yet")
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(patterns) { pattern in
                            let photoUrl: String? = pattern.photoUrl.map { path in
                                path.hasPrefix("http") ? path : "https://images4.ravelry.com\(path)"
                            }
                            NavigationLink(value: Route.patternDetail(id: pattern.id)) {
                                ProfilePatternThumbnail(
                                    title: pattern.name,
                                    imageUrl: photoUrl,
                                    designer: pattern.designer
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
        .padding(.vertical, 8)
    }
}

// MARK: - Pattern Thumbnail

struct ProfilePatternThumbnail: View {
    let title: String
    let imageUrl: String?
    let designer: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Group {
                if let url = imageUrl {
                    AsyncImage(url: URL(string: url)) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        Color.gray.opacity(0.15)
                    }
                } else {
                    Rectangle()
                        .fill(Color(.systemGray6))
                        .overlay {
                            Image(systemName: "book.closed")
                                .foregroundStyle(.tertiary)
                        }
                }
            }
            // 2:3 portrait ratio per design system
            .frame(width: 100, height: 150)
            .clipShape(RoundedRectangle(cornerRadius: 8))

            Text(title)
                .font(.caption.weight(.medium))
                .lineLimit(1)
                .truncationMode(.tail)
                .frame(width: 100, alignment: .leading)

            if let designer = designer {
                Text(designer)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .frame(width: 100, alignment: .leading)
            }
        }
    }
}

// MARK: - Shared Profile Section Components

struct ProfileSectionHeader: View {
    let title: String
    let count: Int
    let countLabel: String

    @Environment(ThemeManager.self) private var theme

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .font(.subheadline.weight(.semibold))
            Text("\(count)")
                .font(.subheadline.weight(.bold))
                .foregroundStyle(theme.primary)
            if count > 0 {
                Text(countLabel)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
    }
}

struct ProfileEmptyState: View {
    let message: String

    var body: some View {
        Text(message)
            .font(.caption)
            .foregroundStyle(.tertiary)
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.vertical, 12)
    }
}
