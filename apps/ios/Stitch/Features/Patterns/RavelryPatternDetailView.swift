import SwiftUI
import SafariServices

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
    let price: Double?
    let currency: String?
    let notesHtml: String?
    let notes: String?
    let downloadLocation: DownloadLocation?
    let sizesAvailable: String?
    let patternCategories: [String]
    let packs: [YarnPack]
    let parsedNotes: [NoteSection]?
    let gaugeStitches: Double?
    let gaugeRows: Double?
    let gaugeNeedleMm: Double?
    let gaugeStitchPattern: String?

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

    struct NoteSection: Codable {
        let title: String
        let content: String
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
    var savedPatternId: String?

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
            let response: APIResponse<Pattern> = try await APIClient.shared.post(
                "/ravelry/patterns/save",
                body: Body(ravelry_id: detail.ravelryId)
            )
            savedPatternId = response.data.id
            didSave = true
        } catch {
            self.error = error.localizedDescription
        }
    }

    var isAddingToQueue = false
    var didAddToQueue = false

    func addToQueue() async {
        // Save first if not already saved
        if !didSave {
            await saveToLibrary()
        }
        guard let patternId = savedPatternId else { return }
        isAddingToQueue = true
        defer { isAddingToQueue = false }
        do {
            struct Body: Encodable { let pattern_id: String }
            let _: APIResponse<QueueItem> = try await APIClient.shared.post(
                "/queue",
                body: Body(pattern_id: patternId)
            )
            didAddToQueue = true
        } catch {
            self.error = error.localizedDescription
        }
    }

    var isStartingProject = false

    func startProject() async -> Project? {
        // Save first if not already saved
        if !didSave {
            await saveToLibrary()
        }
        guard let patternId = savedPatternId else { return nil }
        isStartingProject = true
        defer { isStartingProject = false }
        do {
            struct Body: Encodable { let pattern_id: String }
            let response: APIResponse<Project> = try await APIClient.shared.post(
                "/projects/create-from-pattern",
                body: Body(pattern_id: patternId)
            )
            return response.data
        } catch {
            self.error = error.localizedDescription
            return nil
        }
    }
}

// MARK: - View

struct RavelryPatternDetailView: View {
    let ravelryId: Int
    let patternName: String
    let previewPhotoUrl: String?

    @Environment(ThemeManager.self) private var theme
    @Environment(AppRouter.self) private var router: AppRouter
    @State private var viewModel = RavelryPatternDetailViewModel()
    @State private var selectedPhotoIndex = 0
    @State private var expandedNoteSection: String?
    @State private var showStartFlow = false
    @State private var showPurchaseSafari = false
    @State private var showPostPurchaseGuide = false

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
        .errorAlert(error: $viewModel.error)
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
            RavelryPatternHeader(
                detail: detail,
                selectedPhotoIndex: $selectedPhotoIndex
            )

            VStack(alignment: .leading, spacing: 20) {
                // Action buttons
                actionButtons(detail)

                // Info sections (gauge, metadata, sizes, needles, yarn, notes)
                RavelryPatternInfo(
                    detail: detail,
                    expandedNoteSection: $expandedNoteSection
                )
            }
            .padding()
        }
    }

    // MARK: - Action Buttons

    private func actionButtons(_ detail: RavelryPatternDetail) -> some View {
        VStack(spacing: 10) {
            if detail.free {
                // Free pattern — save + download PDF
                Button {
                    Task { await viewModel.saveToLibrary() }
                } label: {
                    HStack {
                        if viewModel.isSaving {
                            ProgressView().controlSize(.small).tint(.white)
                        } else if viewModel.didSave {
                            Image(systemName: "checkmark")
                        } else {
                            Image(systemName: detail.downloadLocation != nil
                                  ? "arrow.down.circle.fill"
                                  : "bookmark.fill")
                        }
                        Text(savedButtonLabel(detail))
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(theme.primary, in: RoundedRectangle(cornerRadius: 12))
                    .foregroundStyle(.white)
                }
                .disabled(viewModel.isSaving || viewModel.didSave)
            } else {
                // Paid pattern without download access — buy on Ravelry
                Button {
                    showPurchaseSafari = true
                } label: {
                    HStack {
                        Image(systemName: "cart.fill")
                        if let price = detail.price, price > 0 {
                            Text("Buy on Ravelry · \(formatPrice(price, currency: detail.currency))")
                                .fontWeight(.semibold)
                        } else {
                            Text("Buy on Ravelry")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(theme.primary, in: RoundedRectangle(cornerRadius: 12))
                    .foregroundStyle(.white)
                }

                // Save to library (without PDF)
                Button {
                    Task { await viewModel.saveToLibrary() }
                } label: {
                    HStack {
                        if viewModel.isSaving {
                            ProgressView().controlSize(.small)
                        } else if viewModel.didSave {
                            Image(systemName: "checkmark")
                        } else {
                            Image(systemName: "bookmark.fill")
                        }
                        Text(viewModel.didSave ? "Saved to library" : "Save to library")
                            .fontWeight(.medium)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.secondary.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
                    .foregroundStyle(.primary)
                }
                .disabled(viewModel.isSaving || viewModel.didSave)
                .buttonStyle(.plain)
            }

            // Start knitting now — saves first if needed, then opens flow
            Button {
                Task {
                    if !viewModel.didSave {
                        await viewModel.saveToLibrary()
                    }
                    if viewModel.savedPatternId != nil {
                        showStartFlow = true
                    }
                }
            } label: {
                HStack {
                    if viewModel.isStartingProject {
                        ProgressView().controlSize(.small)
                    } else {
                        Image(systemName: "play.fill")
                    }
                    Text("Start knitting")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.secondary.opacity(0.12), in: RoundedRectangle(cornerRadius: 12))
                .foregroundStyle(.primary)
            }
            .disabled(viewModel.isStartingProject || viewModel.isSaving)
            .buttonStyle(.plain)

            // Add to queue — show "In your queue" when already added
            if viewModel.didAddToQueue {
                HStack {
                    Image(systemName: "checkmark")
                    Text("In your queue")
                        .fontWeight(.medium)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(Color.secondary.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
                .foregroundStyle(.secondary)
            } else {
                Button {
                    Task { await viewModel.addToQueue() }
                } label: {
                    HStack {
                        Image(systemName: "text.badge.plus")
                        Text("Add to queue")
                            .fontWeight(.medium)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.secondary.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
                    .foregroundStyle(.primary)
                }
                .disabled(viewModel.isAddingToQueue)
                .buttonStyle(.plain)
            }

            // View in library after save
            if let patternId = viewModel.savedPatternId {
                NavigationLink(value: Route.patternDetail(id: patternId)) {
                    HStack {
                        Image(systemName: "book.closed")
                        Text("View in library")
                            .fontWeight(.medium)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.secondary.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
                    .foregroundStyle(.primary)
                }
            }
        }
        .sheet(isPresented: $showStartFlow) {
            if let patternId = viewModel.savedPatternId {
                StartPatternFlowView(patternId: patternId) { projectId in
                    router.path.append(Route.projectDetail(id: projectId))
                }
            }
        }
        .sheet(isPresented: $showPurchaseSafari, onDismiss: {
            // After closing the purchase browser, show upload instructions
            showPostPurchaseGuide = true
        }) {
            if let url = URL(string: detail.url) {
                SafariSheet(url: url)
                    .ignoresSafeArea()
            }
        }
        .alert("Got your pattern?", isPresented: $showPostPurchaseGuide) {
            Button("Upload PDF") {
                // Save to library first, then they can upload from pattern detail
                Task {
                    if !viewModel.didSave {
                        await viewModel.saveToLibrary()
                    }
                    if let patternId = viewModel.savedPatternId {
                        router.path.append(Route.patternDetail(id: patternId))
                    }
                }
            }
            Button("Not yet", role: .cancel) {}
        } message: {
            Text("After purchasing, download the PDF from Ravelry to your device, then tap \"Upload PDF\" to add it to your pattern library for row-by-row tracking.")
        }
    }

    private func savedButtonLabel(_ detail: RavelryPatternDetail) -> String {
        if viewModel.didSave {
            return detail.downloadLocation != nil
                ? "Saved with PDF" : "Saved to library"
        }
        return detail.downloadLocation != nil
            ? "Save + download PDF" : "Save to library"
    }

    private func formatPrice(_ price: Double, currency: String?) -> String {
        let symbol: String
        switch currency?.uppercased() {
        case "USD": symbol = "$"
        case "EUR": symbol = "€"
        case "GBP": symbol = "£"
        case "CAD": symbol = "CA$"
        case "AUD": symbol = "A$"
        case "SEK": symbol = ""
        case "NOK": symbol = ""
        case "DKK": symbol = ""
        default: symbol = "$"
        }
        if symbol.isEmpty {
            return String(format: "%.2f %@", price, currency ?? "")
        }
        return String(format: "%@%.2f", symbol, price)
    }

}

// MARK: - Safari Sheet

private struct SafariSheet: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> SFSafariViewController {
        SFSafariViewController(url: url)
    }
    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
}
