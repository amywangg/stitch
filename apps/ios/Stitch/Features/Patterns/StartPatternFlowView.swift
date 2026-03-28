import SwiftUI

struct StartPatternFlowView: View {
    /// Initialize with a pre-loaded pattern (from PatternDetailView)
    var pattern: Pattern?
    /// Initialize with just a pattern ID (from RavelryPatternDetailView)
    var patternId: String?
    var onCreatedProject: ((String) -> Void)?

    @Environment(ThemeManager.self) private var theme
    @Environment(SubscriptionManager.self) private var subscriptions
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = StartPatternFlowViewModel()
    @State private var showProPaywall = false

    private var resolvedPatternId: String? {
        pattern?.id ?? patternId
    }

    var body: some View {
        NavigationStack {
            Group {
                switch viewModel.step {
                case .setup:
                    setupStep
                case .selectSize:
                    sizeSelectionStep
                case .applyingSize:
                    progressStep("Parsing instructions...")
                case .manualSetup:
                    ManualSectionSetupView(viewModel: viewModel)
                case .review:
                    reviewStep
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
        .task {
            if let pattern {
                viewModel.pattern = pattern
                if let sections = pattern.sections, !sections.isEmpty {
                    viewModel.manualSections = sections.map {
                        ManualSection(name: $0.name, targetRows: nil)
                    }
                }
                viewModel.selectedSizeName = pattern.selectedSize
            } else if let patternId = resolvedPatternId {
                await viewModel.load(patternId: patternId)
            }
        }
        .onChange(of: viewModel.createdProjectId) { _, projectId in
            if let projectId {
                dismiss()
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    onCreatedProject?(projectId)
                }
            }
        }
        .sheet(isPresented: $showProPaywall) {
            StitchPaywallView()
        }
    }

    private var navigationTitle: String {
        switch viewModel.step {
        case .setup: return "Start project"
        case .selectSize: return "Select size"
        case .applyingSize: return "Parsing..."
        case .manualSetup: return "Set up sections"
        case .review: return "Review"
        case .creatingProject: return "Creating..."
        case .error: return "Error"
        }
    }

    // MARK: - Setup Step

    private var setupStep: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Pattern info card
                if let pattern = viewModel.pattern {
                    patternInfoCard(pattern)
                } else if viewModel.isLoading {
                    ProgressView()
                        .padding(.top, 40)
                }

                if viewModel.pattern != nil {
                    // If AI parsed with multiple sizes, show size selection
                    // Otherwise, just create the project immediately
                    if viewModel.isAiParsed && viewModel.hasMultipleSizes {
                        parseStatusSection

                        Button {
                            viewModel.step = .selectSize
                        } label: {
                            actionButtonLabel("Choose size and start", icon: "ruler")
                        }
                    } else {
                        // Quick start — create project immediately
                        Button {
                            Task { await viewModel.quickStart() }
                        } label: {
                            actionButtonLabel("Start project", icon: "play.fill")
                        }

                        // Show what they'll get
                        if viewModel.hasPdf && !viewModel.isAiParsed {
                            HStack(spacing: 10) {
                                Image(systemName: "doc.text.fill")
                                    .foregroundStyle(.green)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("PDF will be attached to your project")
                                        .font(.caption.weight(.medium))
                                    Text("You can parse it with AI later for row-by-row tracking")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                            }
                            .padding(12)
                            .background(Color.green.opacity(0.06), in: RoundedRectangle(cornerRadius: 10))
                        } else if viewModel.isAiParsed {
                            parseStatusSection
                        }
                    }
                }
            }
            .padding()
        }
    }

    private func patternInfoCard(_ pattern: Pattern) -> some View {
        HStack(spacing: 14) {
            if let coverUrl = pattern.coverImageUrl, let url = URL(string: coverUrl) {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color(.systemGray5)
                }
                .frame(width: 80, height: 106)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }

            VStack(alignment: .leading, spacing: 6) {
                Text(pattern.title)
                    .font(.headline)
                    .lineLimit(2)

                if let designer = pattern.designerName {
                    Text("by \(designer)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                HStack(spacing: 6) {
                    if let craft = pattern.craftType, !craft.isEmpty {
                        chipLabel(craft.capitalized)
                    }
                    if let difficulty = pattern.difficulty {
                        chipLabel(difficulty.capitalized)
                    }
                }
            }

            Spacer(minLength: 0)
        }
        .padding(14)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    @ViewBuilder
    private var parseStatusSection: some View {
        if viewModel.isAiParsed {
            HStack(spacing: 10) {
                Image(systemName: "sparkles")
                    .foregroundStyle(theme.primary)
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 4) {
                        Text("AI parsed")
                            .font(.subheadline.weight(.medium))
                        if let size = viewModel.pattern?.selectedSize {
                            Text("(\(size))")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    if let sections = viewModel.pattern?.sections, !sections.isEmpty {
                        Text("\(sections.count) sections ready")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer()
            }
            .padding(12)
            .background(theme.primary.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
        }
    }

    // primarySetupAction removed — quick start handles everything

    private func actionButtonLabel(_ text: String, icon: String) -> some View {
        HStack {
            Image(systemName: icon)
            Text(text)
                .fontWeight(.semibold)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(theme.primary, in: RoundedRectangle(cornerRadius: 14))
        .foregroundStyle(.white)
    }

    // MARK: - Size Selection Step

    private var sizeSelectionStep: some View {
        VStack(spacing: 0) {
            if let pattern = viewModel.pattern {
                patternCompactHeader(pattern)
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

                                    // Cached indicator
                                    if viewModel.pattern?.selectedSize == size.name {
                                        Image(systemName: "checkmark.circle.fill")
                                            .font(.caption)
                                            .foregroundStyle(.green)
                                    }

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
                viewModel.selectedSizeName = nil
                viewModel.step = .review
            } label: {
                Text("Skip — choose size later")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.vertical, 14)
            }
        }
    }

    // MARK: - Review Step

    private var reviewStep: some View {
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
                    if let size = viewModel.selectedSizeName {
                        chipLabel("Size: \(size)")
                    }
                    let sectionCount = viewModel.reviewSections.count
                    if sectionCount > 0 {
                        chipLabel("\(sectionCount) sections")
                    }
                }

                // Sections preview
                if !viewModel.reviewSections.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        ForEach(viewModel.reviewSections, id: \.name) { section in
                            HStack {
                                Text(section.name)
                                    .font(.subheadline)
                                Spacer()
                                Text(section.rowCount)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(Color(.secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }
                    .padding(.horizontal)
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
                viewModel.step = .setup
            } label: {
                Text("Go back")
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

    private func patternCompactHeader(_ pattern: Pattern) -> some View {
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

    private func chipLabel(_ text: String) -> some View {
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
