import SwiftUI

// MARK: - Profile Projects Grid

struct ProfileProjectsGrid: View {
    let projects: [ProfileProject]
    let stats: ProfileStats

    @Environment(ThemeManager.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ProfileSectionHeader(
                title: "Projects",
                count: stats.projects,
                countLabel: "\(stats.activeProjects) active"
            )
            .padding(.horizontal)

            if projects.isEmpty {
                ProfileEmptyState(message: "No projects yet")
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(projects) { project in
                            NavigationLink(value: Route.projectDetail(id: project.id)) {
                                profileProjectCard(project)
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

    // MARK: - Project Card

    private func profileProjectCard(_ project: ProfileProject) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Group {
                if let coverUrl = project.coverImageUrl, let url = URL(string: coverUrl) {
                    AsyncImage(url: url) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        Color.gray.opacity(0.15)
                    }
                } else {
                    Rectangle()
                        .fill(Color(.systemGray6))
                        .overlay {
                            Image(systemName: project.craftType == "crochet" ? "link" : "scissors")
                                .font(.title2)
                                .foregroundStyle(.tertiary)
                        }
                }
            }
            .frame(width: 130, height: 170)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(alignment: .topLeading) {
                Text(project.status.capitalized)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(statusColor(project.status))
                    .clipShape(Capsule())
                    .shadow(color: .black.opacity(0.3), radius: 2, y: 1)
                    .padding(8)
            }

            Text(project.title)
                .font(.caption.weight(.medium))
                .lineLimit(1)
                .truncationMode(.tail)
                .frame(width: 130, alignment: .leading)

            // Progress bar
            if project.status == "active",
               let section = project.sections.first,
               let target = section.targetRows, target > 0 {
                ProgressView(value: Double(section.currentRow), total: Double(target))
                    .tint(theme.primary)
                    .frame(width: 130)
            }
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "completed": return .green
        case "active": return theme.primary
        case "frogged": return .red
        case "hibernating": return .orange
        default: return .gray
        }
    }
}
