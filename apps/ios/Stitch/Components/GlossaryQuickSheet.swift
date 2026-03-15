import SwiftUI

/// Half-sheet showing a glossary term's definition and key details.
/// Presented when tapping a highlighted term in GlossaryLinkedText.
struct GlossaryQuickSheet: View {
    let term: GlossaryTerm
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss
    @State private var showHowTo = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    headerSection

                    if let videoUrl = term.videoUrl,
                       let videoID = YouTubeHelpers.extractVideoID(from: videoUrl) {
                        videoSection(videoID)
                    }

                    definitionSection

                    if let howTo = term.howTo, !howTo.isEmpty {
                        howToSection(howTo)
                    }

                    if let tips = term.tips, !tips.isEmpty {
                        tipsSection(tips)
                    }

                    viewFullDetailsLink
                }
                .padding()
            }
            .navigationTitle(term.abbreviation ?? term.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let abbrev = term.abbreviation {
                Text(abbrev)
                    .font(.title2.weight(.bold).monospaced())
                    .foregroundStyle(theme.primary)
            }
            Text(term.name)
                .font(.headline)

            HStack(spacing: 8) {
                Text(term.difficulty.capitalized)
                    .font(.caption2.weight(.medium))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(
                        Color(hex: GlossaryViewModel.difficultyColor(term.difficulty)).opacity(0.15),
                        in: Capsule()
                    )
                    .foregroundStyle(Color(hex: GlossaryViewModel.difficultyColor(term.difficulty)))

                Text(GlossaryViewModel.categoryLabel(term.category))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - Definition

    private var definitionSection: some View {
        Text(term.definition)
            .font(.body)
            .foregroundStyle(.secondary)
    }

    // MARK: - How To (expandable)

    private func howToSection(_ howTo: String) -> some View {
        DisclosureGroup("How to", isExpanded: $showHowTo) {
            VStack(alignment: .leading, spacing: 4) {
                ForEach(howTo.components(separatedBy: "\n").filter { !$0.isEmpty }, id: \.self) { step in
                    Text(step)
                        .font(.body)
                }
            }
            .padding(.top, 6)
        }
        .font(.subheadline.weight(.semibold))
    }

    // MARK: - Tips

    private func tipsSection(_ tips: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "lightbulb.fill")
                .foregroundStyle(.yellow)
                .font(.caption)
            Text(tips)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.yellow.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    // MARK: - Video

    private func videoSection(_ videoID: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Video")
                .font(.subheadline.weight(.semibold))

            VideoThumbnail(
                videoID: videoID,
                startSeconds: term.videoStartS,
                endSeconds: term.videoEndS,
                isShort: term.videoIsShort ?? false,
                alternateIDs: term.videoAlternates ?? []
            )
        }
    }

    // MARK: - Full Details Link

    private var viewFullDetailsLink: some View {
        NavigationLink(value: Route.glossaryDetail(slug: term.slug)) {
            HStack {
                Text("View full details")
                    .font(.subheadline.weight(.medium))
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
            .padding(12)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
    }
}
