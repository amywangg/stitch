import SwiftUI

// MARK: - Ravelry Pattern Info (Metadata Sections)

struct RavelryPatternInfo: View {
    @Environment(ThemeManager.self) private var theme
    let detail: RavelryPatternDetail
    @Binding var expandedNoteSection: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Gauge card
            if detail.gaugeStitches != nil || detail.gaugeRows != nil || detail.gaugeNeedleMm != nil {
                gaugeSection
            }

            // Quick metadata
            metadataSection

            // Sizes
            if let sizes = detail.sizesAvailable, !sizes.isEmpty {
                sizesSection(sizes)
            }

            // Needles
            if !detail.needleSizes.isEmpty {
                needlesSection(detail.needleSizes)
            }

            // Yarn / materials
            if !detail.packs.isEmpty {
                yarnSection(detail.packs)
            }

            // Parsed note sections (measurements, materials, etc.)
            if let parsedNotes = detail.parsedNotes, !parsedNotes.isEmpty {
                notesSections(parsedNotes)
            }
        }
    }

    // MARK: - Gauge

    private var gaugeSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Gauge")
                .font(.headline)

            HStack(spacing: 10) {
                if let sts = detail.gaugeStitches {
                    gaugeCard(String(format: "%.0f", sts), "sts", "per 10 cm")
                }
                if let rows = detail.gaugeRows {
                    gaugeCard(String(format: "%.0f", rows), "rows", "per 10 cm")
                }
                if let needle = detail.gaugeNeedleMm {
                    gaugeCard(String(format: "%.1f", needle), "mm", "needle")
                }
            }

            if let pattern = detail.gaugeStitchPattern {
                Text("in \(pattern)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 4)
            }
        }
    }

    private func gaugeCard(_ value: String, _ unit: String, _ label: String) -> some View {
        VStack(spacing: 2) {
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(value)
                    .font(.title3.weight(.semibold))
                Text(unit)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
            }
            Text(label)
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color.secondary.opacity(0.06), in: RoundedRectangle(cornerRadius: 10))
    }

    // MARK: - Metadata

    private var metadataSection: some View {
        LazyVGrid(columns: [
            GridItem(.flexible(), spacing: 10),
            GridItem(.flexible(), spacing: 10),
        ], spacing: 10) {
            if let weight = detail.weight {
                metadataChip(icon: "scalemass", value: weight.capitalized)
            }
            if let difficulty = detail.difficulty {
                metadataChip(icon: "chart.bar", value: String(format: "%.1f / 5", difficulty))
            }
            if let yardage = formatYardage(min: detail.yardageMin, max: detail.yardageMax) {
                metadataChip(icon: "line.3.horizontal", value: yardage)
            }
            metadataChip(icon: "hand.draw", value: detail.craft.capitalized)
        }
    }

    private func metadataChip(icon: String, value: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(theme.primary)
            Text(value)
                .font(.subheadline)
                .lineLimit(1)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color.secondary.opacity(0.06), in: RoundedRectangle(cornerRadius: 10))
    }

    // MARK: - Sizes

    private func sizesSection(_ sizes: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Sizes")
                .font(.headline)

            let sizeList = sizes
                .components(separatedBy: CharacterSet(charactersIn: ",/"))
                .map { $0.trimmingCharacters(in: .whitespaces) }
                .filter { !$0.isEmpty }

            if sizeList.count > 1 {
                // Show as capsule chips
                FlowLayout(spacing: 8) {
                    ForEach(sizeList, id: \.self) { size in
                        Text(size)
                            .font(.caption.weight(.medium))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.secondary.opacity(0.08), in: Capsule())
                    }
                }
            } else {
                Text(sizes)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - Needles

    private func needlesSection(_ needles: [String]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Needles")
                .font(.headline)

            ForEach(needles, id: \.self) { needle in
                HStack(spacing: 8) {
                    Image(systemName: "pencil.and.outline")
                        .font(.caption)
                        .foregroundStyle(theme.primary)
                    Text(needle)
                        .font(.subheadline)
                }
            }
        }
    }

    // MARK: - Yarn

    private func yarnSection(_ packs: [RavelryPatternDetail.YarnPack]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Suggested yarn")
                .font(.headline)

            ForEach(Array(packs.enumerated()), id: \.offset) { _, pack in
                HStack(spacing: 12) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(theme.primary.opacity(0.15))
                        .frame(width: 4, height: 36)

                    VStack(alignment: .leading, spacing: 3) {
                        if let name = pack.yarnName {
                            Text(name)
                                .font(.subheadline.weight(.medium))
                        }
                        HStack(spacing: 6) {
                            if let company = pack.yarnCompany {
                                Text(company)
                            }
                            if let yards = pack.totalYards {
                                Text("·")
                                Text("\(Int(yards)) yds")
                            }
                            if let skeins = pack.skeins {
                                Text("·")
                                Text("\(Int(skeins)) skeins")
                            }
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    // MARK: - Parsed Notes

    private func notesSections(_ sections: [RavelryPatternDetail.NoteSection]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach(sections, id: \.title) { section in
                // Skip sections already displayed as structured UI
                if !isRedundantSection(section.title) {
                    noteCard(section)
                }
            }
        }
    }

    private func noteCard(_ section: RavelryPatternDetail.NoteSection) -> some View {
        let isExpanded = expandedNoteSection == section.title
        let isShort = section.content.count < 200

        return VStack(alignment: .leading, spacing: 6) {
            if isShort {
                // Short sections — always show fully
                Text(section.title)
                    .font(.headline)
                MarkdownBoldText(section.content)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                // Longer sections — collapsible
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        expandedNoteSection = isExpanded ? nil : section.title
                    }
                } label: {
                    HStack {
                        Text(section.title)
                            .font(.headline)
                            .foregroundStyle(.primary)
                        Spacer()
                        Image(systemName: "chevron.down")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.tertiary)
                            .rotationEffect(.degrees(isExpanded ? 180 : 0))
                    }
                }
                .buttonStyle(.plain)

                MarkdownBoldText(section.content)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(isExpanded ? nil : 3)
            }
        }
    }

    /// Sections that are already shown as structured UI — skip them in the notes list
    private func isRedundantSection(_ title: String) -> Bool {
        let lower = title.lowercased()
        return lower == "sizes" || lower == "gauge" || lower == "needles"
    }

    // MARK: - Helpers

    private func formatYardage(min: Int?, max: Int?) -> String? {
        switch (min, max) {
        case let (lo?, hi?) where lo == hi:
            return "\(lo) yards"
        case let (lo?, hi?):
            return "\(lo)–\(hi) yards"
        case let (lo?, nil):
            return "\(lo)+ yards"
        case let (nil, hi?):
            return "Up to \(hi) yards"
        default:
            return nil
        }
    }
}
