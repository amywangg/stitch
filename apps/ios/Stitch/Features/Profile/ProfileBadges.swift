import SwiftUI

// MARK: - Badge Definition

struct ProfileBadge: Identifiable {
    let id: String
    let icon: String
    let label: String
    let color: Color
    let earned: Bool
}

// MARK: - Badge Computation

/// Computes earned badges from profile data. No API call needed — all derived from existing stats.
func computeBadges(
    stats: ProfileStats,
    user: ProfileUser,
    ravelry: RavelryInfo?,
    heatmap: [HeatmapDay]
) -> [ProfileBadge] {
    var badges: [ProfileBadge] = []

    // ── Connection badges ─────────────────────────────────────────────

    badges.append(ProfileBadge(
        id: "ravelry",
        icon: "link.circle.fill",
        label: "Ravelry linked",
        color: Color(hex: "#E74C3C"),
        earned: ravelry != nil
    ))

    badges.append(ProfileBadge(
        id: "pro",
        icon: "crown.fill",
        label: "Pro member",
        color: Color(hex: "#FFD700"),
        earned: user.isPro
    ))

    // ── Project milestones ────────────────────────────────────────────

    let completed = stats.completedProjects

    badges.append(ProfileBadge(
        id: "first_fo",
        icon: "checkmark.circle.fill",
        label: "First FO",
        color: .green,
        earned: completed >= 1
    ))

    badges.append(ProfileBadge(
        id: "five_fos",
        icon: "star.fill",
        label: "5 projects done",
        color: Color(hex: "#FF6B6B"),
        earned: completed >= 5
    ))

    badges.append(ProfileBadge(
        id: "ten_fos",
        icon: "trophy.fill",
        label: "10 projects done",
        color: Color(hex: "#FFD700"),
        earned: completed >= 10
    ))

    badges.append(ProfileBadge(
        id: "prolific",
        icon: "medal.fill",
        label: "25 projects",
        color: Color(hex: "#4ECDC4"),
        earned: completed >= 25
    ))

    // ── Stash milestones ──────────────────────────────────────────────

    badges.append(ProfileBadge(
        id: "stash_starter",
        icon: "basket.fill",
        label: "Stash started",
        color: .orange,
        earned: stats.stashItems >= 1
    ))

    badges.append(ProfileBadge(
        id: "yarn_hoarder",
        icon: "shippingbox.fill",
        label: "Yarn collector",
        color: .purple,
        earned: stats.stashItems >= 20
    ))

    // ── Social badges ─────────────────────────────────────────────────

    badges.append(ProfileBadge(
        id: "social",
        icon: "person.2.fill",
        label: "Made a friend",
        color: Color(hex: "#4ECDC4"),
        earned: stats.following >= 1
    ))

    badges.append(ProfileBadge(
        id: "popular",
        icon: "heart.fill",
        label: "10 followers",
        color: Color(hex: "#FF6B6B"),
        earned: stats.followers >= 10
    ))

    // ── Review badge ──────────────────────────────────────────────────

    badges.append(ProfileBadge(
        id: "reviewer",
        icon: "star.bubble.fill",
        label: "Pattern reviewer",
        color: .yellow,
        earned: stats.reviews >= 1
    ))

    // ── Crafting time ─────────────────────────────────────────────────

    let totalHours = stats.totalCraftingMinutesThisYear / 60

    badges.append(ProfileBadge(
        id: "dedicated",
        icon: "flame.fill",
        label: "10 hours crafted",
        color: .orange,
        earned: totalHours >= 10
    ))

    badges.append(ProfileBadge(
        id: "marathon",
        icon: "bolt.fill",
        label: "100 hours crafted",
        color: Color(hex: "#FF6B6B"),
        earned: totalHours >= 100
    ))

    // ── Streak badge (crafted 7+ days in a row from heatmap) ─────────

    let maxStreak = longestStreak(heatmap)

    badges.append(ProfileBadge(
        id: "streak_7",
        icon: "calendar.badge.clock",
        label: "7-day streak",
        color: Color(hex: "#4ECDC4"),
        earned: maxStreak >= 7
    ))

    badges.append(ProfileBadge(
        id: "streak_30",
        icon: "calendar.badge.checkmark",
        label: "30-day streak",
        color: Color(hex: "#FFD700"),
        earned: maxStreak >= 30
    ))

    // ── Queue badge ───────────────────────────────────────────────────

    badges.append(ProfileBadge(
        id: "planner",
        icon: "list.bullet.clipboard.fill",
        label: "Queue planner",
        color: .blue,
        earned: stats.queueItems >= 3
    ))

    // ── Pattern collector ─────────────────────────────────────────────

    badges.append(ProfileBadge(
        id: "collector",
        icon: "books.vertical.fill",
        label: "Pattern collector",
        color: .indigo,
        earned: stats.savedPatterns >= 10
    ))

    return badges
}

/// Computes the longest consecutive-day crafting streak from heatmap data.
private func longestStreak(_ heatmap: [HeatmapDay]) -> Int {
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"

    let activeDates = Set(
        heatmap
            .filter { $0.minutes > 0 }
            .compactMap { dateFormatter.date(from: $0.date) }
            .map { Calendar.current.startOfDay(for: $0) }
    )

    guard !activeDates.isEmpty else { return 0 }

    let sorted = activeDates.sorted()
    var maxStreak = 1
    var currentStreak = 1

    for i in 1..<sorted.count {
        let daysBetween = Calendar.current.dateComponents([.day], from: sorted[i - 1], to: sorted[i]).day ?? 0
        if daysBetween == 1 {
            currentStreak += 1
            maxStreak = max(maxStreak, currentStreak)
        } else {
            currentStreak = 1
        }
    }

    return maxStreak
}

// MARK: - Badges Display View

struct ProfileBadgesSection: View {
    let badges: [ProfileBadge]
    @Environment(ThemeManager.self) private var theme

    private var earned: [ProfileBadge] { badges.filter(\.earned) }
    private var locked: [ProfileBadge] { badges.filter { !$0.earned } }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if !earned.isEmpty {
                Text("Badges")
                    .font(.headline)
                    .padding(.horizontal)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(earned) { badge in
                            badgeChip(badge)
                        }
                    }
                    .padding(.horizontal)
                }
            }

            if !locked.isEmpty {
                DisclosureGroup {
                    FlowLayout(spacing: 8) {
                        ForEach(locked) { badge in
                            lockedBadgeChip(badge)
                        }
                    }
                    .padding(.top, 6)
                } label: {
                    Text("\(locked.count) more to earn")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal)
            }
        }
        .padding(.vertical, 8)
    }

    private func badgeChip(_ badge: ProfileBadge) -> some View {
        HStack(spacing: 6) {
            Image(systemName: badge.icon)
                .font(.caption)
                .foregroundStyle(badge.color)
            Text(badge.label)
                .font(.caption.weight(.medium))
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(badge.color.opacity(0.12), in: Capsule())
    }

    private func lockedBadgeChip(_ badge: ProfileBadge) -> some View {
        HStack(spacing: 6) {
            Image(systemName: badge.icon)
                .font(.caption)
                .foregroundStyle(.quaternary)
            Text(badge.label)
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color(.systemGray6), in: Capsule())
    }
}
