import SwiftUI

// MARK: - Profile Header

struct ProfileHeader: View {
    let user: ProfileUser
    let stats: ProfileStats
    let onEditProfile: () -> Void

    @Environment(ThemeManager.self) private var theme

    var body: some View {
        VStack(spacing: 14) {
            // Avatar with Pro ring — tap to edit profile
            Button { onEditProfile() } label: {
                ZStack(alignment: .bottomTrailing) {
                    AsyncImage(url: URL(string: user.avatarUrl ?? "")) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        Image(systemName: "person.circle.fill")
                            .resizable()
                            .foregroundStyle(.gray.opacity(0.3))
                    }
                    .frame(width: 96, height: 96)
                    .clipShape(Circle())
                    .overlay(
                        Circle()
                            .stroke(
                                user.isPro ? theme.primary : Color.clear,
                                lineWidth: 3
                            )
                            .padding(-2)
                    )

                    Image(systemName: "camera.circle.fill")
                        .font(.title3)
                        .foregroundStyle(.white, theme.primary)
                        .offset(x: 2, y: 2)
                }
            }
            .buttonStyle(.plain)

            // Name + Pro badge
            HStack(spacing: 6) {
                Text(user.displayName ?? user.username)
                    .font(.title2.weight(.bold))

                if user.isPro {
                    Text("PRO")
                        .font(.system(size: 10, weight: .heavy))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(theme.primary)
                        .clipShape(Capsule())
                }
            }

            Text("@\(user.username)")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            // Bio
            if let bio = user.bio, !bio.isEmpty {
                Text(bio)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }

            // Metadata chips
            FlowLayout(spacing: 8) {
                if let location = user.location, !location.isEmpty {
                    profileChip(icon: "location", text: location)
                }
                profileChip(icon: "scissors", text: craftLabel(user.craftPreference))
                if let level = user.experienceLevel, !level.isEmpty {
                    profileChip(icon: "chart.bar", text: level.capitalized)
                }
                if let website = user.website, !website.isEmpty {
                    profileChip(icon: "link", text: cleanURL(website))
                }
                profileChip(
                    icon: "calendar",
                    text: "Joined \(user.memberSince.formatted(.dateTime.month(.abbreviated).year()))"
                )
            }
            .padding(.horizontal)

            // Edit profile + Find friends buttons
            HStack(spacing: 10) {
                Button {
                    onEditProfile()
                } label: {
                    Text("Edit profile")
                        .font(.subheadline.weight(.medium))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color(.systemGray5))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)

                NavigationLink(value: Route.findFriends) {
                    Text("Find friends")
                        .font(.subheadline.weight(.medium))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color(.systemGray5))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal)
            .padding(.top, 4)
        }
        .padding(.vertical, 20)
    }

    // MARK: - Helpers

    private func profileChip(icon: String, text: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 10))
            Text(text)
                .font(.caption)
        }
        .foregroundStyle(.secondary)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color(.systemGray6))
        .clipShape(Capsule())
    }

    private func craftLabel(_ pref: String) -> String {
        switch pref {
        case "knitting": return "Knitter"
        case "crochet", "crocheting": return "Crocheter"
        case "both": return "Knitter & crocheter"
        default: return "Maker"
        }
    }

    private func cleanURL(_ url: String) -> String {
        url.replacingOccurrences(of: "https://", with: "")
            .replacingOccurrences(of: "http://", with: "")
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }
}

// MARK: - Stats Grid

struct ProfileStatsGrid: View {
    let stats: ProfileStats
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 4), spacing: 12) {
            statCell(value: stats.projects, label: "Projects")
            statCell(value: stats.completedProjects, label: "Finished")
            NavigationLink(value: Route.followersList) {
                statCellContent(value: stats.followers, label: "Followers")
            }
            .buttonStyle(.plain)
            NavigationLink(value: Route.followingList) {
                statCellContent(value: stats.following, label: "Following")
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal)
        .padding(.vertical, 14)
        .background(Color(.secondarySystemBackground))
    }

    private func statCell(value: Int, label: String) -> some View {
        statCellContent(value: value, label: label)
    }

    private func statCellContent(value: Int, label: String) -> some View {
        VStack(spacing: 2) {
            Text("\(value)")
                .font(.headline)
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }
}
