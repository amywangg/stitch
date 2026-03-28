import SwiftUI

// MARK: - ViewModel

@Observable
final class CommunityPatternDetailViewModel {
    var pattern: CommunityPatternDetail?
    var isLoading = false
    var error: String?
    var isSaving = false
    var didSave = false

    func load(patternId: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<CommunityPatternDetail> = try await APIClient.shared.get(
                "/patterns/community/\(patternId)"
            )
            pattern = response.data
        } catch {
            self.error = error.localizedDescription
        }
    }

    func saveToLibrary() async {
        guard let pattern else { return }
        isSaving = true
        defer { isSaving = false }
        do {
            struct Body: Encodable {
                let title: String
                let description: String?
                let craft_type: String
                let difficulty: String?
                let garment_type: String?
                let source_url: String?
            }
            struct SaveResult: Decodable { let id: String }
            let _: APIResponse<SaveResult> = try await APIClient.shared.post(
                "/patterns",
                body: Body(
                    title: pattern.title,
                    description: pattern.description,
                    craft_type: pattern.craftType,
                    difficulty: pattern.difficulty,
                    garment_type: pattern.garmentType,
                    source_url: pattern.sourceUrl
                )
            )
            didSave = true
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - View

struct CommunityPatternDetailView: View {
    let patternId: String
    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = CommunityPatternDetailViewModel()

    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let pattern = viewModel.pattern {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        // Cover image
                        if let coverUrl = pattern.coverImageUrl, let url = URL(string: coverUrl) {
                            AsyncImage(url: url) { image in
                                image.resizable().aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Color.secondary.opacity(0.15)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 300)
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

                                HStack(spacing: 4) {
                                    Image(systemName: "person.circle")
                                        .font(.caption)
                                    Text("Shared by @\(pattern.author.username)")
                                        .font(.caption)
                                }
                                .foregroundStyle(.tertiary)
                            }

                            // Metadata chips
                            FlowLayout(spacing: 8) {
                                MetadataTag(label: pattern.craftType.capitalized, icon: "hand.draw")
                                if let difficulty = pattern.difficulty {
                                    MetadataTag(label: difficulty.capitalized, icon: "chart.bar")
                                }
                                if let garment = pattern.garmentType {
                                    MetadataTag(label: garment.capitalized, icon: "tshirt")
                                }
                                if let weight = pattern.yarnWeight {
                                    MetadataTag(label: weight, icon: "scalemass")
                                }
                            }

                            // Rating
                            if let rating = pattern.rating {
                                HStack(spacing: 4) {
                                    Image(systemName: "star.fill")
                                        .foregroundStyle(theme.primary)
                                    Text(String(format: "%.1f", rating))
                                        .font(.subheadline.weight(.medium))
                                    if let count = pattern.ratingCount {
                                        Text("(\(count))")
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }

                            // Yardage
                            if let yardageMin = pattern.yardageMin {
                                HStack(spacing: 6) {
                                    Image(systemName: "wand.and.rays.inverse")
                                        .font(.caption)
                                        .foregroundStyle(theme.primary)
                                    if let yardageMax = pattern.yardageMax, yardageMax != yardageMin {
                                        Text("\(yardageMin)–\(yardageMax) yards")
                                            .font(.subheadline)
                                    } else {
                                        Text("\(yardageMin) yards")
                                            .font(.subheadline)
                                    }
                                }
                                .foregroundStyle(.secondary)
                            }

                            // Gauge
                            if pattern.gaugeStitchesPer10cm != nil || pattern.gaugeRowsPer10cm != nil || pattern.needleSizeMm != nil {
                                gaugeBlock(pattern)
                            }

                            // Sizes
                            if let sizes = pattern.sizesAvailable, !sizes.isEmpty {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Sizes").font(.headline)
                                    Text(sizes)
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                }
                            }

                            // Description
                            if let description = pattern.description, !description.isEmpty {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Description").font(.headline)
                                    Text(description)
                                        .font(.body)
                                        .foregroundStyle(.secondary)
                                }
                            }

                            // Save button
                            saveButton
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
        .task { await viewModel.load(patternId: patternId) }
        .errorAlert(error: $viewModel.error)
    }

    // MARK: - Gauge Block

    private func gaugeBlock(_ pattern: CommunityPatternDetail) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Gauge").font(.headline)
            HStack(spacing: 12) {
                if let sts = pattern.gaugeStitchesPer10cm {
                    gaugeCard(String(format: "%.1f", sts), "sts/10cm")
                }
                if let rows = pattern.gaugeRowsPer10cm {
                    gaugeCard(String(format: "%.1f", rows), "rows/10cm")
                }
                if let needle = pattern.needleSizeMm {
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

    // MARK: - Save Button

    private var saveButton: some View {
        Group {
            if viewModel.didSave {
                HStack {
                    Image(systemName: "checkmark")
                    Text("Saved to library")
                        .fontWeight(.medium)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .foregroundStyle(.secondary)
            } else {
                Button {
                    Task { await viewModel.saveToLibrary() }
                } label: {
                    HStack {
                        if viewModel.isSaving {
                            ProgressView().controlSize(.small).tint(.white)
                        } else {
                            Image(systemName: "square.and.arrow.down")
                        }
                        Text("Save to my library")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(theme.primary, in: RoundedRectangle(cornerRadius: 12))
                    .foregroundStyle(.white)
                }
                .disabled(viewModel.isSaving)
                .buttonStyle(.plain)
            }
        }
    }
}

// MARK: - Supporting Views

private struct MetadataTag: View {
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
