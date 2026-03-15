import SwiftUI

struct LearnView: View {
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Glossary section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Glossary")
                        .font(.headline)
                        .padding(.horizontal)

                    NavigationLink(value: Route.glossaryBrowse()) {
                        LearnSectionCard(
                            title: "Browse all terms",
                            subtitle: "Knitting and crochet terminology with definitions, how-to guides, and video tutorials",
                            icon: "character.book.closed",
                            color: theme.primary
                        )
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal)
                }

                // Tutorials section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Tutorials")
                        .font(.headline)
                        .padding(.horizontal)

                    NavigationLink(value: Route.tutorialBrowse) {
                        LearnSectionCard(
                            title: "Step-by-step tutorials",
                            subtitle: "Learn techniques from cast on to finishing with guided walkthroughs",
                            icon: "list.number",
                            color: Color(hex: "#4ECDC4")
                        )
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal)
                }

                // Quick reference categories
                VStack(alignment: .leading, spacing: 12) {
                    Text("Quick reference")
                        .font(.headline)
                        .padding(.horizontal)

                    LazyVGrid(columns: [
                        GridItem(.flexible(), spacing: 12),
                        GridItem(.flexible(), spacing: 12),
                    ], spacing: 12) {
                        ForEach(quickCategories, id: \.category) { item in
                            NavigationLink(value: Route.glossaryBrowse(category: item.category)) {
                                QuickCategoryCard(
                                    title: item.label,
                                    icon: item.icon,
                                    color: item.color
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .padding(.vertical)
        }
    }

    // MARK: - Quick Categories

    private struct QuickCategory {
        let category: String
        let label: String
        let icon: String
        let color: Color
    }

    private var quickCategories: [QuickCategory] {
        [
            QuickCategory(category: "decrease", label: "Decreases", icon: "arrow.down.right.and.arrow.up.left", color: Color(hex: "#FF6B6B")),
            QuickCategory(category: "increase", label: "Increases", icon: "arrow.up.left.and.arrow.down.right", color: Color(hex: "#4ECDC4")),
            QuickCategory(category: "cast_on", label: "Cast on", icon: "arrow.right.to.line", color: Color(hex: "#FFB347")),
            QuickCategory(category: "bind_off", label: "Bind off", icon: "arrow.left.to.line", color: Color(hex: "#87CEEB")),
            QuickCategory(category: "stitch_pattern", label: "Stitches", icon: "square.grid.3x3", color: Color(hex: "#DDA0DD")),
            QuickCategory(category: "finishing", label: "Finishing", icon: "checkmark.seal", color: Color(hex: "#98FB98")),
        ]
    }
}

// MARK: - Section Card

private struct LearnSectionCard: View {
    let title: String
    let subtitle: String
    let icon: String
    let color: Color

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)
                .frame(width: 44, height: 44)
                .background(color.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(14)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

// MARK: - Quick Category Card

private struct QuickCategoryCard: View {
    let title: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
            Text(title)
                .font(.caption.weight(.medium))
                .foregroundStyle(.primary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
