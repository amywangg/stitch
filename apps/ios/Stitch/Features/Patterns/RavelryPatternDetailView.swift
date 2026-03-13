import SwiftUI

// MARK: - Model

struct RavelryPatternDetail: Codable {
    let ravelryId: Int
    let name: String
    let permalink: String
    let url: String
    let craft: String
    let weight: String?
    let yardageMin: Int?
    let yardageMax: Int?
    let gauge: String?
    let needleSizes: [String]
    let difficulty: Double?
    let rating: Double?
    let ratingCount: Int
    let photoUrl: String?
    let photos: [String]
    let designer: String?
    let free: Bool
    let notesHtml: String?
    let notes: String?
    let downloadLocation: DownloadLocation?
    let sizesAvailable: String?
    let patternCategories: [String]
    let packs: [YarnPack]

    struct DownloadLocation: Codable {
        let url: String
        let type: String
        let free: Bool
    }

    struct YarnPack: Codable {
        let yarnName: String?
        let yarnCompany: String?
        let skeins: Double?
        let totalYards: Double?
    }
}

// MARK: - ViewModel

@Observable
final class RavelryPatternDetailViewModel {
    var detail: RavelryPatternDetail?
    var isLoading = false
    var error: String?
    var isSaving = false
    var didSave = false
    var isDownloading = false
    var downloadedPatternId: String?

    func load(ravelryId: Int) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<RavelryPatternDetail> = try await APIClient.shared.get(
                "/ravelry/patterns/\(ravelryId)"
            )
            detail = response.data
        } catch {
            self.error = error.localizedDescription
        }
    }

    func saveToLibrary() async {
        guard let detail else { return }
        isSaving = true
        defer { isSaving = false }
        do {
            struct Body: Encodable { let ravelry_id: Int }
            struct SaveResult: Decodable { let id: String }
            let _: APIResponse<SaveResult> = try await APIClient.shared.post(
                "/ravelry/patterns/save",
                body: Body(ravelry_id: detail.ravelryId)
            )
            didSave = true
        } catch {
            self.error = error.localizedDescription
        }
    }

    func downloadToLibrary() async {
        guard let detail else { return }
        isDownloading = true
        defer { isDownloading = false }
        do {
            let response: APIResponse<Pattern> = try await APIClient.shared.post(
                "/ravelry/patterns/\(detail.ravelryId)/download"
            )
            downloadedPatternId = response.data.id
            didSave = true
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - View

struct RavelryPatternDetailView: View {
    let ravelryId: Int
    let patternName: String
    let previewPhotoUrl: String?

    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = RavelryPatternDetailViewModel()
    @State private var selectedPhotoIndex = 0

    var body: some View {
        ScrollView {
            if viewModel.isLoading {
                loadingState
            } else if let detail = viewModel.detail {
                patternContent(detail)
            } else {
                ContentUnavailableView("Couldn't load pattern", systemImage: "exclamationmark.triangle")
            }
        }
        .navigationTitle(viewModel.detail?.name ?? patternName)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if let detail = viewModel.detail {
                ToolbarItem(placement: .topBarTrailing) {
                    ShareLink(item: URL(string: detail.url)!) {
                        Image(systemName: "square.and.arrow.up")
                    }
                }
            }
        }
        .alert("Error", isPresented: .init(
            get: { viewModel.error != nil },
            set: { if !$0 { viewModel.error = nil } }
        )) {
            Button("OK") { viewModel.error = nil }
        } message: {
            Text(viewModel.error ?? "")
        }
        .task { await viewModel.load(ravelryId: ravelryId) }
    }

    // MARK: - Loading

    private var loadingState: some View {
        VStack(spacing: 0) {
            // Show preview photo while loading
            if let photoUrl = previewPhotoUrl, let url = URL(string: photoUrl) {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color.secondary.opacity(0.1)
                }
                .frame(height: 320)
                .frame(maxWidth: .infinity)
                .clipped()
            }

            VStack(spacing: 12) {
                ProgressView()
                Text("Loading pattern details...")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.top, 32)
        }
    }

    // MARK: - Content

    private func patternContent(_ detail: RavelryPatternDetail) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // Photo gallery
            if !detail.photos.isEmpty {
                photoGallery(detail.photos)
            }

            VStack(alignment: .leading, spacing: 20) {
                // Title + designer
                titleSection(detail)

                // Action buttons
                actionButtons(detail)

                // Metadata
                metadataSection(detail)

                // Yarn info
                if !detail.packs.isEmpty {
                    yarnSection(detail.packs)
                }

                // Description / notes
                if let notes = detail.notes, !notes.isEmpty {
                    notesSection(notes)
                }

                // Ravelry link
                ravelryLink(detail)
            }
            .padding()
        }
    }

    // MARK: - Photo Gallery

    private func photoGallery(_ photos: [String]) -> some View {
        TabView(selection: $selectedPhotoIndex) {
            ForEach(Array(photos.enumerated()), id: \.offset) { index, urlStr in
                if let url = URL(string: urlStr) {
                    AsyncImage(url: url) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Color.secondary.opacity(0.1)
                            .overlay { ProgressView() }
                    }
                    .tag(index)
                }
            }
        }
        .tabViewStyle(.page(indexDisplayMode: photos.count > 1 ? .always : .never))
        .frame(height: 360)
        .clipped()
    }

    // MARK: - Title

    private func titleSection(_ detail: RavelryPatternDetail) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(detail.name)
                .font(.title2.weight(.bold))

            if let designer = detail.designer {
                Text("by \(designer)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 12) {
                if let rating = detail.rating {
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .foregroundStyle(theme.primary)
                        Text(String(format: "%.1f", rating))
                            .fontWeight(.medium)
                        Text("(\(detail.ratingCount))")
                            .foregroundStyle(.secondary)
                    }
                    .font(.subheadline)
                }

                if detail.free {
                    Text("Free")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(theme.primary)
                }
            }
            .padding(.top, 2)

            if !detail.patternCategories.isEmpty {
                Text(detail.patternCategories.joined(separator: " · "))
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
        }
    }

    // MARK: - Action Buttons

    private func actionButtons(_ detail: RavelryPatternDetail) -> some View {
        VStack(spacing: 10) {
            // Download free pattern PDF to library
            if detail.free, detail.downloadLocation != nil {
                Button {
                    Task { await viewModel.downloadToLibrary() }
                } label: {
                    HStack {
                        if viewModel.isDownloading {
                            ProgressView().controlSize(.small).tint(.white)
                        } else if viewModel.downloadedPatternId != nil {
                            Image(systemName: "checkmark")
                        } else {
                            Image(systemName: "arrow.down.circle.fill")
                        }
                        Text(viewModel.downloadedPatternId != nil ? "Downloaded to library" : "Download to library")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(
                        viewModel.downloadedPatternId != nil ? theme.primary : theme.primary,
                        in: RoundedRectangle(cornerRadius: 12)
                    )
                    .foregroundStyle(.white)
                }
                .disabled(viewModel.isDownloading || viewModel.downloadedPatternId != nil)
            }

            // Save to library (bookmark without PDF)
            if !detail.free || detail.downloadLocation == nil {
                Button {
                    Task { await viewModel.saveToLibrary() }
                } label: {
                    HStack {
                        if viewModel.isSaving {
                            ProgressView().controlSize(.small).tint(.white)
                        } else {
                            Image(systemName: viewModel.didSave ? "checkmark" : "bookmark.fill")
                        }
                        Text(viewModel.didSave ? "Saved to library" : "Save to library")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(
                        viewModel.didSave ? theme.primary : theme.primary,
                        in: RoundedRectangle(cornerRadius: 12)
                    )
                    .foregroundStyle(.white)
                }
                .disabled(viewModel.isSaving || viewModel.didSave)
            }

            // View downloaded pattern
            if let patternId = viewModel.downloadedPatternId {
                NavigationLink(value: Route.patternDetail(id: patternId)) {
                    HStack {
                        Image(systemName: "doc.text")
                        Text("View in library")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.secondary.opacity(0.12), in: RoundedRectangle(cornerRadius: 12))
                    .foregroundStyle(.primary)
                }
            }
        }
    }

    // MARK: - Metadata

    private func metadataSection(_ detail: RavelryPatternDetail) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Details")
                .font(.headline)

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 12),
                GridItem(.flexible(), spacing: 12),
            ], spacing: 12) {
                if let weight = detail.weight {
                    metadataCard(icon: "scalemass", label: "Weight", value: weight.capitalized)
                }
                if let difficulty = detail.difficulty {
                    metadataCard(icon: "chart.bar", label: "Difficulty", value: String(format: "%.1f / 5", difficulty))
                }
                if let gauge = detail.gauge {
                    metadataCard(icon: "ruler", label: "Gauge", value: gauge)
                }
                if !detail.needleSizes.isEmpty {
                    metadataCard(icon: "pencil.and.outline", label: "Needles", value: detail.needleSizes.joined(separator: ", "))
                }
                if let yardage = formatYardage(min: detail.yardageMin, max: detail.yardageMax) {
                    metadataCard(icon: "line.3.horizontal", label: "Yardage", value: yardage)
                }
                if let sizes = detail.sizesAvailable {
                    metadataCard(icon: "person.crop.rectangle", label: "Sizes", value: sizes)
                }
            }
        }
    }

    private func metadataCard(icon: String, label: String, value: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .font(.subheadline)
                .foregroundStyle(theme.primary)
                .frame(width: 20)

            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(value)
                    .font(.subheadline)
                    .lineLimit(3)
            }

            Spacer(minLength: 0)
        }
        .padding(12)
        .background(Color.secondary.opacity(0.06), in: RoundedRectangle(cornerRadius: 10))
    }

    // MARK: - Yarn

    private func yarnSection(_ packs: [RavelryPatternDetail.YarnPack]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Yarn")
                .font(.headline)

            ForEach(Array(packs.enumerated()), id: \.offset) { _, pack in
                HStack(spacing: 10) {
                    Image(systemName: "circle.fill")
                        .font(.system(size: 6))
                        .foregroundStyle(theme.primary)
                        .padding(.top, 4)

                    VStack(alignment: .leading, spacing: 2) {
                        if let name = pack.yarnName {
                            Text(name)
                                .font(.subheadline.weight(.medium))
                        }
                        HStack(spacing: 8) {
                            if let company = pack.yarnCompany {
                                Text(company)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            if let yards = pack.totalYards {
                                Text("\(Int(yards)) yards")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            if let skeins = pack.skeins {
                                Text("\(Int(skeins)) skeins")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Notes

    private func notesSection(_ notes: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Description")
                .font(.headline)

            Text(notes)
                .font(.body)
                .foregroundStyle(.secondary)
                .lineLimit(12)
        }
    }

    // MARK: - Ravelry Link

    private func ravelryLink(_ detail: RavelryPatternDetail) -> some View {
        Link(destination: URL(string: detail.url)!) {
            HStack {
                Image(systemName: "link")
                Text("View on Ravelry")
                Spacer()
                Image(systemName: "arrow.up.right")
            }
            .font(.subheadline)
            .padding(12)
            .background(Color.secondary.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
        }
        .padding(.bottom, 20)
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
