import SwiftUI

// MARK: - Editable Notes Block

struct ProjectEditableNotesBlock: View {
    let title: String
    let text: String?
    let onEdit: () -> Void
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        let hasContent = text != nil && !(text?.isEmpty ?? true)

        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title).font(.headline)
                Spacer()
                Button {
                    onEdit()
                } label: {
                    Text(hasContent ? "Edit" : "Add")
                        .font(.subheadline)
                        .foregroundStyle(theme.primary)
                }
            }
            if let text, !text.isEmpty {
                Text(text).font(.body).foregroundStyle(.secondary)
            } else {
                Text("No \(title.lowercased()) yet")
                    .font(.body)
                    .foregroundStyle(.tertiary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - PDF Block

struct ProjectPdfBlock: View {
    let pdf: PdfUpload
    let onTap: () -> Void
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Pattern PDF").font(.headline)
            Button {
                onTap()
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: "doc.fill")
                        .foregroundStyle(theme.primary)
                        .font(.title3)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(pdf.fileName ?? "Untitled PDF")
                            .font(.subheadline.weight(.medium))
                            .lineLimit(2)
                        Text(ByteCountFormatter.string(fromByteCount: Int64(pdf.fileSize ?? 0), countStyle: .file))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

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
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Gauge Block

struct ProjectGaugeBlock: View {
    let gauge: ProjectGauge
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Gauge").font(.headline)
            HStack(spacing: 12) {
                if let sts = gauge.stitchesPer10cm {
                    gaugeCard(String(format: "%.1f", sts), "sts/10cm")
                }
                if let rows = gauge.rowsPer10cm {
                    gaugeCard(String(format: "%.1f", rows), "rows/10cm")
                }
                if let needle = gauge.needleSizeMm {
                    gaugeCard(String(format: "%.1fmm", needle), "needle")
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func gaugeCard(_ value: String, _ label: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.title3.weight(.semibold))
            Text(label).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

// MARK: - Yarns Block

struct ProjectYarnsBlock: View {
    let yarns: [ProjectYarn]
    let onAdd: () -> Void
    let onDelete: (ProjectYarn) -> Void
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Yarns").font(.headline)
                Spacer()
                Button { onAdd() } label: {
                    Label("Add", systemImage: "plus.circle")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(theme.primary)
                }
                .buttonStyle(.plain)
            }

            if yarns.isEmpty {
                Text("No yarns attached")
                    .font(.body)
                    .foregroundStyle(.tertiary)
            } else {
                ForEach(yarns) { yarn in
                    HStack(spacing: 12) {
                        Circle()
                            .fill(theme.primary.opacity(0.2))
                            .frame(width: 40, height: 40)
                            .overlay {
                                Image(systemName: "wand.and.rays.inverse")
                                    .foregroundStyle(theme.primary)
                            }
                        VStack(alignment: .leading, spacing: 2) {
                            Text(yarn.displayName)
                                .font(.subheadline.weight(.medium))
                            HStack(spacing: 8) {
                                if let cw = yarn.colorway { Text(cw).font(.caption).foregroundStyle(.secondary) }
                                if let sk = yarn.skeinsUsed, sk > 0 {
                                    Text("\(String(format: "%.1f", sk)) skeins").font(.caption).foregroundStyle(.secondary)
                                }
                            }
                        }
                        Spacer()
                        Button { onDelete(yarn) } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.tertiary)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(12)
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Needles Block

struct ProjectNeedlesBlock: View {
    let needles: [ProjectNeedle]
    let onAdd: () -> Void
    let onDelete: (ProjectNeedle) -> Void
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Needles & hooks").font(.headline)
                Spacer()
                Button { onAdd() } label: {
                    Label("Add", systemImage: "plus.circle")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(theme.primary)
                }
                .buttonStyle(.plain)
            }

            if needles.isEmpty {
                Text("No needles attached")
                    .font(.body)
                    .foregroundStyle(.tertiary)
            } else {
                ForEach(needles) { needle in
                    HStack(spacing: 12) {
                        Circle()
                            .fill(Color(hex: "#4ECDC4").opacity(0.2))
                            .frame(width: 40, height: 40)
                            .overlay {
                                Image(systemName: needleIcon(needle.type))
                                    .foregroundStyle(Color(hex: "#4ECDC4"))
                            }
                        VStack(alignment: .leading, spacing: 2) {
                            Text(needle.displayLabel)
                                .font(.subheadline.weight(.medium))
                            HStack(spacing: 8) {
                                if let material = needle.material {
                                    Text(material.capitalized).font(.caption).foregroundStyle(.secondary)
                                }
                                if let brand = needle.brand {
                                    Text(brand).font(.caption).foregroundStyle(.secondary)
                                }
                            }
                        }
                        Spacer()
                        Button { onDelete(needle) } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.tertiary)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(12)
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func needleIcon(_ type: String) -> String {
        switch type {
        case "circular": return "arrow.triangle.2.circlepath"
        case "dpn": return "line.3.horizontal"
        case "crochet_hook": return "pencil"
        default: return "minus"
        }
    }
}

// MARK: - Sessions Block

struct ProjectSessionsBlock: View {
    let sessions: [CraftingSession]
    let isCompleted: Bool
    let onLogSession: () -> Void
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Recent sessions").font(.headline)
                Spacer()
                if !isCompleted {
                    Button {
                        onLogSession()
                    } label: {
                        Image(systemName: "plus.circle")
                            .font(.body)
                            .foregroundStyle(theme.primary)
                    }
                }
            }

            ForEach(sessions) { session in
                HStack(spacing: 12) {
                    Image(systemName: "clock")
                        .font(.subheadline)
                        .foregroundStyle(theme.primary)
                        .frame(width: 28)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(formatSessionDuration(session))
                            .font(.subheadline.weight(.medium))
                        Text(formatSessionDate(session.startedAt ?? session.date))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    if let rowsStart = session.rowsStart, let rowsEnd = session.rowsEnd, rowsEnd > rowsStart {
                        Text("+\(rowsEnd - rowsStart) rows")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(10)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func formatSessionDuration(_ session: CraftingSession) -> String {
        let mins = session.activeMinutes ?? session.durationMinutes
        if mins < 60 {
            return "\(mins) min"
        }
        let hours = mins / 60
        let remaining = mins % 60
        if remaining == 0 {
            return "\(hours) hr"
        }
        return "\(hours) hr \(remaining) min"
    }

    private func formatSessionDate(_ date: Date) -> String {
        let cal = Calendar.current
        if cal.isDateInToday(date) {
            return "Today"
        } else if cal.isDateInYesterday(date) {
            return "Yesterday"
        }
        let fmt = DateFormatter()
        fmt.dateStyle = .medium
        fmt.timeStyle = .none
        return fmt.string(from: date)
    }
}
