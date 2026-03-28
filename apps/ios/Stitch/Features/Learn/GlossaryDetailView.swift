import SwiftUI

struct GlossaryDetailView: View {
    let slug: String
    @Environment(ThemeManager.self) private var theme
    @State private var term: GlossaryTerm?
    @State private var relatedTerms: [GlossaryTerm] = []
    @State private var isLoading = true
    @State private var error: String?

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let term {
                scrollContent(term)
            } else {
                ContentUnavailableView("Term not found", systemImage: "book.closed")
            }
        }
        .navigationTitle(term?.name ?? "Term")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .errorAlert(error: $error)
    }

    // MARK: - Content

    private func scrollContent(_ term: GlossaryTerm) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                headerSection(term)

                if let videoUrl = term.videoUrl,
                   let videoID = YouTubeHelpers.extractVideoID(from: videoUrl) {
                    videoSection(term, videoID: videoID)
                }

                definitionSection(term)

                if let howTo = term.howTo, !howTo.isEmpty {
                    howToSection(howTo)
                }

                if let tips = term.tips, !tips.isEmpty {
                    tipsSection(tips)
                }

                if let synonyms = term.synonyms, !synonyms.isEmpty {
                    synonymsSection(synonyms)
                }

                if !relatedTerms.isEmpty {
                    relatedSection
                }
            }
            .padding()
        }
    }

    // MARK: - Header

    private func headerSection(_ term: GlossaryTerm) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if let abbrev = term.abbreviation {
                Text(abbrev)
                    .font(.title.weight(.bold).monospaced())
                    .foregroundStyle(theme.primary)
            }

            Text(term.name)
                .font(.title2.weight(.bold))

            FlowLayout(spacing: 8) {
                badgeChip(
                    GlossaryViewModel.categoryLabel(term.category),
                    icon: GlossaryViewModel.categoryIcon(term.category)
                )
                badgeChip(
                    term.difficulty.capitalized,
                    color: Color(hex: GlossaryViewModel.difficultyColor(term.difficulty))
                )
                if term.craftType != "both" {
                    badgeChip(
                        term.craftType.capitalized,
                        icon: term.craftType == "crochet" ? "lasso" : "hand.draw"
                    )
                }
            }
        }
    }

    private func badgeChip(_ label: String, icon: String? = nil, color: Color? = nil) -> some View {
        HStack(spacing: 4) {
            if let icon {
                Image(systemName: icon)
                    .font(.caption2)
            }
            Text(label)
                .font(.caption.weight(.medium))
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background((color ?? Color.secondary).opacity(0.12), in: Capsule())
        .foregroundStyle(color ?? .secondary)
    }

    // MARK: - Definition

    private func definitionSection(_ term: GlossaryTerm) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Definition")
                .font(.headline)
            Text(term.definition)
                .font(.body)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - How To

    private func howToSection(_ howTo: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("How to")
                .font(.headline)

            VStack(alignment: .leading, spacing: 6) {
                ForEach(howTo.components(separatedBy: "\n").filter { !$0.isEmpty }, id: \.self) { step in
                    GlossaryLinkedText(text: step)
                        .font(.body)
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    // MARK: - Tips

    private func tipsSection(_ tips: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Tips")
                .font(.headline)

            HStack(alignment: .top, spacing: 10) {
                Image(systemName: "lightbulb.fill")
                    .foregroundStyle(.yellow)
                    .font(.subheadline)
                Text(tips)
                    .font(.body)
                    .foregroundStyle(.secondary)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.yellow.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    // MARK: - Synonyms

    private func synonymsSection(_ synonyms: [GlossarySynonym]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Also known as")
                .font(.headline)

            FlowLayout(spacing: 8) {
                ForEach(synonyms) { syn in
                    HStack(spacing: 4) {
                        Text(syn.synonym)
                            .font(.subheadline.weight(.medium))
                        if let region = syn.region {
                            Text("(\(region))")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(Capsule())
                }
            }
        }
    }

    // MARK: - Video

    private func videoSection(_ term: GlossaryTerm, videoID: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Video tutorial")
                .font(.headline)

            VideoThumbnail(
                videoID: videoID,
                startSeconds: term.videoStartS,
                endSeconds: term.videoEndS,
                isShort: term.videoIsShort ?? false,
                alternateIDs: term.videoAlternates ?? []
            )
        }
    }

    // MARK: - Related Terms

    private var relatedSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Related terms")
                .font(.headline)

            ForEach(relatedTerms.prefix(6)) { related in
                NavigationLink(value: Route.glossaryDetail(slug: related.slug)) {
                    HStack(spacing: 8) {
                        if let abbrev = related.abbreviation {
                            Text(abbrev)
                                .font(.caption.weight(.bold).monospaced())
                                .foregroundStyle(theme.primary)
                                .frame(width: 50, alignment: .leading)
                        }
                        Text(related.name)
                            .font(.subheadline)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                    .padding(.vertical, 4)
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Loading

    private func load() async {
        isLoading = true
        defer { isLoading = false }

        // Show cached data immediately if available
        if let cached = GlossaryCache.shared.lookup(slug: slug) {
            term = cached
            loadRelated(cached)
        }

        // Always fetch from API for fresh data (video URLs, etc.)
        do {
            let response: APIResponse<GlossaryTerm> = try await APIClient.shared.get("/glossary/\(slug)")
            term = response.data
            loadRelated(response.data)
        } catch {
            // Only show error if we have no cached data
            if term == nil {
                self.error = error.localizedDescription
            }
        }
    }

    private func loadRelated(_ term: GlossaryTerm) {
        relatedTerms = GlossaryCache.shared.terms
            .filter { $0.category == term.category && $0.id != term.id }
            .prefix(6)
            .map { $0 }
    }
}
