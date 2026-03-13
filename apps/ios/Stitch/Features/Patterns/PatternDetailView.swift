import SwiftUI

// MARK: - ViewModel

@Observable
final class PatternDetailViewModel {
    var pattern: Pattern?
    var isLoading = false
    var error: String?
    var isDeleting = false
    var didDelete = false
    var selectedSizeId: String?

    func load(patternId: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<Pattern> = try await APIClient.shared.get("/patterns/\(patternId)")
            pattern = response.data
            if let selected = response.data.selectedSize,
               let match = response.data.sizes?.first(where: { $0.name == selected }) {
                selectedSizeId = match.id
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deletePattern() async {
        guard let pattern else { return }
        isDeleting = true
        defer { isDeleting = false }
        do {
            struct Empty: Decodable {}
            let _: Empty = try await APIClient.shared.delete("/patterns/\(pattern.id)")
            didDelete = true
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - View

struct PatternDetailView: View {
    let patternId: String
    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = PatternDetailViewModel()
    @State private var showDeleteConfirmation = false
    @State private var showPdfViewer = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let pattern = viewModel.pattern {
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        // Cover image
                        if let coverUrl = pattern.coverImageUrl, let url = URL(string: coverUrl) {
                            AsyncImage(url: url) { image in
                                image.resizable().aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Color.secondary.opacity(0.15)
                            }
                            .frame(height: 300)
                            .frame(maxWidth: .infinity)
                            .clipped()
                        }

                        VStack(alignment: .leading, spacing: 16) {
                            // Title + designer
                            VStack(alignment: .leading, spacing: 4) {
                                Text(pattern.title)
                                    .font(.title2.weight(.bold))

                                if let designer = pattern.designerName {
                                    Text("by \(designer)")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                }
                            }

                            // Metadata chips
                            FlowLayout(spacing: 8) {
                                if let craft = pattern.craftType.nilIfEmpty {
                                    MetadataChip(label: craft.capitalized, icon: "hand.draw")
                                }
                                if let difficulty = pattern.difficulty {
                                    MetadataChip(label: difficulty.capitalized, icon: "chart.bar")
                                }
                                if let garment = pattern.garmentType {
                                    MetadataChip(label: garment.capitalized, icon: "tshirt")
                                }
                                if let weight = pattern.yarnWeight {
                                    MetadataChip(label: weight, icon: "scalemass")
                                }
                                if pattern.aiParsed {
                                    MetadataChip(label: "AI parsed", icon: "sparkles")
                                }
                            }

                            // Gauge block
                            if pattern.gaugeStitchesPer10cm != nil || pattern.gaugeRowsPer10cm != nil || pattern.needleSizeMm != nil {
                                gaugeBlock(pattern)
                            }

                            // Sizes section
                            if let sizes = pattern.sizes, !sizes.isEmpty {
                                sizesBlock(sizes)
                            }

                            // Description
                            if let description = pattern.description, !description.isEmpty {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Description")
                                        .font(.headline)
                                    Text(description)
                                        .font(.body)
                                        .foregroundStyle(.secondary)
                                }
                            }

                            // Sections accordion
                            if let sections = pattern.sections, !sections.isEmpty {
                                sectionsAccordion(sections)
                            }

                            // Source link
                            if let sourceUrl = pattern.sourceUrl, let url = URL(string: sourceUrl) {
                                Link(destination: url) {
                                    HStack {
                                        Image(systemName: "link")
                                        Text("View on Ravelry")
                                        Spacer()
                                        Image(systemName: "arrow.up.right")
                                    }
                                    .font(.subheadline)
                                    .padding(12)
                                    .background(Color.secondary.opacity(0.1), in: RoundedRectangle(cornerRadius: 10))
                                }
                            }

                            // Action buttons
                            actionButtons(pattern)
                        }
                        .padding()
                    }
                }
            } else {
                ContentUnavailableView("Pattern not found", systemImage: "book.closed")
            }
        }
        .navigationTitle(viewModel.pattern?.title ?? "Pattern")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    if let sourceUrl = viewModel.pattern?.sourceUrl, let url = URL(string: sourceUrl) {
                        ShareLink(item: url) {
                            Label("Share", systemImage: "square.and.arrow.up")
                        }
                    }
                    if viewModel.pattern?.pdfUrl != nil {
                        Button {
                            showPdfViewer = true
                        } label: {
                            Label("View PDF", systemImage: "doc.text")
                        }
                    }
                    Button(role: .destructive) {
                        showDeleteConfirmation = true
                    } label: {
                        Label("Delete pattern", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .alert("Delete pattern?", isPresented: $showDeleteConfirmation) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                Task { await viewModel.deletePattern() }
            }
        } message: {
            Text("This pattern will be removed from your library.")
        }
        .alert("Error", isPresented: .init(
            get: { viewModel.error != nil },
            set: { if !$0 { viewModel.error = nil } }
        )) {
            Button("OK") { viewModel.error = nil }
        } message: {
            Text(viewModel.error ?? "")
        }
        .task { await viewModel.load(patternId: patternId) }
        .onChange(of: viewModel.didDelete) { _, deleted in
            if deleted { dismiss() }
        }
        .sheet(isPresented: $showPdfViewer) {
            if let pattern = viewModel.pattern, pattern.pdfUrl != nil {
                NavigationStack {
                    PDFViewerView(pdfUploadId: pattern.id, fileName: pattern.title)
                        .toolbar {
                            ToolbarItem(placement: .cancellationAction) {
                                Button("Done") { showPdfViewer = false }
                            }
                        }
                }
            }
        }
    }

    // MARK: - Gauge Block

    private func gaugeBlock(_ pattern: Pattern) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Gauge").font(.headline)
            HStack(spacing: 12) {
                if let sts = pattern.gaugeStitchesPer10cm {
                    patternGaugeCard(String(format: "%.1f", sts), "sts/10cm")
                }
                if let rows = pattern.gaugeRowsPer10cm {
                    patternGaugeCard(String(format: "%.1f", rows), "rows/10cm")
                }
                if let needle = pattern.needleSizeMm {
                    patternGaugeCard(String(format: "%.1fmm", needle), "needle")
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func patternGaugeCard(_ value: String, _ label: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.title3.weight(.semibold))
            Text(label).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    // MARK: - Sizes

    private func sizesBlock(_ sizes: [PatternSize]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Sizes").font(.headline)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(sizes) { size in
                        let isSelected = size.id == viewModel.selectedSizeId
                        Button {
                            viewModel.selectedSizeId = isSelected ? nil : size.id
                        } label: {
                            Text(size.name)
                                .font(.subheadline.weight(.medium))
                                .padding(.horizontal, 14)
                                .padding(.vertical, 8)
                                .background(
                                    isSelected ? theme.primary : Color(.secondarySystemGroupedBackground),
                                    in: Capsule()
                                )
                                .foregroundStyle(isSelected ? .white : .primary)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            // Expanded size detail
            if let selectedId = viewModel.selectedSizeId,
               let size = sizes.first(where: { $0.id == selectedId }) {
                HStack(spacing: 16) {
                    if let bust = size.finishedBustCm {
                        VStack(spacing: 2) {
                            Text(String(format: "%.0f cm", bust)).font(.subheadline.weight(.medium))
                            Text("Bust").font(.caption2).foregroundStyle(.secondary)
                        }
                    }
                    if let length = size.finishedLengthCm {
                        VStack(spacing: 2) {
                            Text(String(format: "%.0f cm", length)).font(.subheadline.weight(.medium))
                            Text("Length").font(.caption2).foregroundStyle(.secondary)
                        }
                    }
                    if let yardage = size.yardage {
                        VStack(spacing: 2) {
                            Text("\(yardage) yds").font(.subheadline.weight(.medium))
                            Text("Yardage").font(.caption2).foregroundStyle(.secondary)
                        }
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(12)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Sections Accordion

    private func sectionsAccordion(_ sections: [PatternSection]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Sections").font(.headline)
            ForEach(sections) { section in
                DisclosureGroup {
                    if let rows = section.rows, !rows.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            ForEach(rows) { row in
                                HStack(alignment: .top, spacing: 8) {
                                    Text("\(row.rowNumber)")
                                        .font(.caption.weight(.semibold).monospacedDigit())
                                        .foregroundStyle(.secondary)
                                        .frame(width: 24, alignment: .trailing)

                                    VStack(alignment: .leading, spacing: 2) {
                                        if let rowType = row.rowType {
                                            Text(rowType.replacingOccurrences(of: "_", with: " "))
                                                .font(.caption2.weight(.semibold))
                                                .textCase(.uppercase)
                                                .foregroundStyle(theme.primary)
                                        }
                                        Text(row.instruction)
                                            .font(.caption)
                                        if let count = row.stitchCount {
                                            Text("\(count) sts")
                                                .font(.caption2)
                                                .foregroundStyle(.secondary)
                                        }
                                    }
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    } else {
                        if let content = section.content {
                            Text(content)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .padding(.vertical, 4)
                        }
                    }
                } label: {
                    HStack {
                        Text(section.name)
                            .font(.subheadline.weight(.medium))
                        Spacer()
                        if let rows = section.rows {
                            Text("\(rows.count) steps")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color(.systemGray5), in: Capsule())
                        }
                    }
                }
                .padding(12)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Action Buttons

    private func actionButtons(_ pattern: Pattern) -> some View {
        VStack(spacing: 10) {
            if let pdfUrl = pattern.pdfUrl, !pdfUrl.isEmpty {
                Button {
                    showPdfViewer = true
                } label: {
                    Label("View PDF", systemImage: "doc.text")
                        .font(.subheadline.weight(.medium))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color(.secondarySystemGroupedBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .buttonStyle(.plain)
            }
        }
    }
}

// MARK: - Supporting Views

private struct MetadataChip: View {
    let label: String
    let icon: String

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption2)
            Text(label)
                .font(.caption)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color.secondary.opacity(0.1), in: Capsule())
    }
}

// FlowLayout is defined in ProfileView.swift (shared)

private extension String {
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}
