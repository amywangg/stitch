import SwiftUI
import UniformTypeIdentifiers

struct PDFParseFlowView: View {
    var onCreatedProject: ((String) -> Void)?

    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = PDFParseFlowViewModel()
    @State private var isPickerPresented = false

    var body: some View {
        NavigationStack {
            Group {
                switch viewModel.step {
                case .pickPdf:
                    pickPdfStep
                case .parsing:
                    parsingStep
                case .ravelryMatch:
                    ravelryMatchStep
                case .selectSize:
                    sizeSelectionStep
                case .applyingSize:
                    progressStep("Parsing instructions...")
                case .ready:
                    readyStep
                case .creatingProject:
                    progressStep("Creating project...")
                case .error(let message):
                    errorStep(message)
                }
            }
            .navigationTitle(navigationTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .onChange(of: viewModel.createdProjectId) { _, projectId in
            if let projectId {
                dismiss()
                // Small delay to let sheet dismiss before navigation
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    onCreatedProject?(projectId)
                }
            }
        }
    }

    private var navigationTitle: String {
        switch viewModel.step {
        case .pickPdf: return "Upload PDF"
        case .parsing: return "Parsing..."
        case .ravelryMatch: return "Match pattern"
        case .selectSize: return "Select size"
        case .applyingSize: return "Parsing..."
        case .ready: return "Ready"
        case .creatingProject: return "Creating..."
        case .error: return "Error"
        }
    }

    // MARK: - Pick PDF Step

    private var pickPdfStep: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "doc.badge.plus")
                .font(.system(size: 52))
                .foregroundStyle(theme.primary)

            VStack(spacing: 6) {
                Text("Upload a pattern PDF")
                    .font(.title3.weight(.semibold))
                Text("We'll parse it with AI, match it to Ravelry, and set up your project.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }

            Button {
                isPickerPresented = true
            } label: {
                Label("Choose PDF", systemImage: "folder")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(theme.primary)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .padding(.horizontal, 40)

            Spacer()
        }
        .padding()
        .fileImporter(
            isPresented: $isPickerPresented,
            allowedContentTypes: [UTType.pdf],
            allowsMultipleSelection: false
        ) { result in
            handleFileSelection(result)
        }
    }

    private func handleFileSelection(_ result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            guard let url = urls.first else { return }
            guard url.startAccessingSecurityScopedResource() else {
                viewModel.step = .error("Cannot access the selected file.")
                return
            }
            defer { url.stopAccessingSecurityScopedResource() }

            guard let data = try? Data(contentsOf: url) else {
                viewModel.step = .error("Failed to read the file.")
                return
            }

            let fileName = url.lastPathComponent
            Task { await viewModel.parsePdf(data: data, fileName: fileName) }

        case .failure(let error):
            viewModel.step = .error(error.localizedDescription)
        }
    }

    // MARK: - Parsing Step

    private var parsingStep: some View {
        VStack(spacing: 20) {
            Spacer()

            ProgressView()
                .scaleEffect(1.4)
                .padding(.bottom, 8)

            Text(viewModel.progressMessage)
                .font(.headline)

            Text("This may take a moment")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Spacer()
        }
    }

    // MARK: - Ravelry Match Step

    private var ravelryMatchStep: some View {
        VStack(spacing: 0) {
            // Parsed info header
            if let pattern = viewModel.pattern {
                VStack(spacing: 4) {
                    Text(pattern.title)
                        .font(.headline)
                    if let designer = pattern.designerName {
                        Text("by \(designer)")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color(.secondarySystemGroupedBackground))
            }

            Text("Is this your pattern?")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.secondary)
                .padding(.top, 12)
                .padding(.bottom, 4)

            ScrollView {
                LazyVStack(spacing: 10) {
                    ForEach(viewModel.ravelryMatches) { match in
                        ravelryMatchCard(match)
                    }
                }
                .padding()
            }

            // Skip button
            Button {
                viewModel.skipRavelryLink()
            } label: {
                Text("None of these — continue without linking")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.vertical, 14)
            }
        }
        .overlay {
            if viewModel.isLinkingRavelry {
                Color.black.opacity(0.3)
                    .ignoresSafeArea()
                    .overlay {
                        ProgressView()
                            .scaleEffect(1.2)
                            .tint(.white)
                    }
            }
        }
    }

    private func ravelryMatchCard(_ match: RavelryMatchCandidate) -> some View {
        Button {
            Task { await viewModel.linkRavelry(match) }
        } label: {
            HStack(spacing: 12) {
                if let photoUrl = match.photoUrl, let url = URL(string: photoUrl) {
                    AsyncImage(url: url) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Color(.systemGray5)
                    }
                    .frame(width: 60, height: 80)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(match.name)
                        .font(.subheadline.weight(.medium))
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    if let designer = match.designer {
                        Text("by \(designer)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    HStack(spacing: 8) {
                        if match.free {
                            Text("Free")
                                .font(.caption2.weight(.medium))
                                .foregroundStyle(.green)
                        }
                        if let rating = match.rating {
                            HStack(spacing: 2) {
                                Image(systemName: "star.fill")
                                    .font(.caption2)
                                    .foregroundStyle(.orange)
                                Text(String(format: "%.1f", rating))
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        if let weight = match.weight {
                            Text(weight)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
            .padding(12)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
        .disabled(viewModel.isLinkingRavelry)
    }

    // MARK: - Size Selection Step

    private var sizeSelectionStep: some View {
        VStack(spacing: 0) {
            // Pattern summary
            if let pattern = viewModel.pattern {
                patternSummaryHeader(pattern)
            }

            Text("Which size are you making?")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.secondary)
                .padding(.top, 12)

            if let sizes = viewModel.pattern?.sizes, !sizes.isEmpty {
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(sizes) { size in
                            Button {
                                Task { await viewModel.applySize(size.name) }
                            } label: {
                                HStack {
                                    Text(size.name)
                                        .font(.body.weight(.medium))

                                    Spacer()

                                    if let bust = size.finishedBustCm {
                                        Text("\(String(format: "%.0f", bust)) cm bust")
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }

                                    Image(systemName: "chevron.right")
                                        .font(.caption)
                                        .foregroundStyle(.tertiary)
                                }
                                .padding(14)
                                .background(Color(.secondarySystemGroupedBackground))
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding()
                }
            }

            Button {
                viewModel.skipSizeSelection()
            } label: {
                Text("Skip — choose size later")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.vertical, 14)
            }
        }
    }

    // MARK: - Ready Step

    private var readyStep: some View {
        VStack(spacing: 20) {
            Spacer()

            if let pattern = viewModel.pattern {
                // Cover image
                if let coverUrl = pattern.coverImageUrl, let url = URL(string: coverUrl) {
                    AsyncImage(url: url) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Color(.systemGray5)
                    }
                    .frame(width: 140, height: 186)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                VStack(spacing: 4) {
                    Text(pattern.title)
                        .font(.title3.weight(.bold))
                        .multilineTextAlignment(.center)

                    if let designer = pattern.designerName {
                        Text("by \(designer)")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }

                // Metadata chips
                HStack(spacing: 8) {
                    if let size = pattern.selectedSize {
                        infoChip("Size: \(size)")
                    }
                    if let sections = pattern.sections, !sections.isEmpty {
                        infoChip("\(sections.count) sections")
                    }
                    if let craft = pattern.craftType.nilIfEmpty {
                        infoChip(craft.capitalized)
                    }
                }

                if pattern.ravelryId != nil {
                    HStack(spacing: 4) {
                        Image(systemName: "link")
                            .font(.caption2)
                        Text("Linked to Ravelry")
                            .font(.caption)
                    }
                    .foregroundStyle(theme.primary)
                }
            }

            Spacer()

            Button {
                Task { await viewModel.createProject() }
            } label: {
                Text("Start project")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(theme.primary)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .padding(.horizontal)
            .padding(.bottom, 8)
        }
        .padding()
    }

    // MARK: - Progress Step

    private func progressStep(_ message: String) -> some View {
        VStack(spacing: 20) {
            Spacer()
            ProgressView()
                .scaleEffect(1.4)
            Text(message)
                .font(.headline)
            Spacer()
        }
    }

    // MARK: - Error Step

    private func errorStep(_ message: String) -> some View {
        VStack(spacing: 16) {
            Spacer()

            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 44))
                .foregroundStyle(.orange)

            Text("Something went wrong")
                .font(.headline)

            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)

            Button {
                viewModel.step = .pickPdf
            } label: {
                Text("Try again")
                    .font(.subheadline.weight(.medium))
                    .padding(.horizontal, 24)
                    .padding(.vertical, 10)
                    .background(theme.primary.opacity(0.15))
                    .foregroundStyle(theme.primary)
                    .clipShape(Capsule())
            }

            Spacer()
        }
    }

    // MARK: - Shared Components

    private func patternSummaryHeader(_ pattern: Pattern) -> some View {
        HStack(spacing: 12) {
            if let coverUrl = pattern.coverImageUrl, let url = URL(string: coverUrl) {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color(.systemGray5)
                }
                .frame(width: 48, height: 64)
                .clipShape(RoundedRectangle(cornerRadius: 6))
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(pattern.title)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(2)
                if let designer = pattern.designerName {
                    Text("by \(designer)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
    }

    private func infoChip(_ text: String) -> some View {
        Text(text)
            .font(.caption)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(Color.secondary.opacity(0.1), in: Capsule())
    }
}

private extension String {
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}
