import SwiftUI

struct AIPatternBuilderView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = AIPatternBuilderViewModel()
    @State private var navigateToPattern = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Progress indicator
                progressBar

                // Stage content
                Group {
                    switch viewModel.currentStage {
                    case 1:
                        ProjectTypePicker(viewModel: viewModel)
                    case 2:
                        YarnSelectionView(viewModel: viewModel)
                    case 3:
                        ProjectOptionsView(viewModel: viewModel)
                    case 4:
                        SizeSelectionView(viewModel: viewModel)
                    case 5:
                        BuilderReviewView(viewModel: viewModel)
                    default:
                        EmptyView()
                    }
                }
                .frame(maxHeight: .infinity)

                // Navigation buttons
                if !viewModel.isGenerating {
                    bottomBar
                }
            }
            .navigationTitle(stageTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    if !viewModel.isGenerating {
                        Button("Cancel") { dismiss() }
                    }
                }
            }
            .task { await viewModel.loadConfig() }
            .onChange(of: viewModel.generatedPatternId) { _, patternId in
                if patternId != nil {
                    navigateToPattern = true
                }
            }
            .navigationDestination(isPresented: $navigateToPattern) {
                if let patternId = viewModel.generatedPatternId {
                    PatternDetailView(patternId: patternId)
                }
            }
            .errorAlert(error: $viewModel.error)
        }
    }

    private var stageTitle: String {
        switch viewModel.currentStage {
        case 1: return "Choose a project"
        case 2: return "Select yarn"
        case 3: return "Design options"
        case 4: return "Choose size"
        case 5: return "Review"
        default: return "Pattern builder"
        }
    }

    // MARK: - Progress

    private var progressBar: some View {
        HStack(spacing: 6) {
            ForEach(1...viewModel.totalStages, id: \.self) { stage in
                Capsule()
                    .fill(stage <= viewModel.currentStage ? theme.primary : Color(.systemGray4))
                    .frame(height: 4)
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 10)
    }

    // MARK: - Bottom Bar

    private var bottomBar: some View {
        HStack(spacing: 12) {
            if viewModel.currentStage > 1 {
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        viewModel.goBack()
                    }
                } label: {
                    Text("Back")
                        .font(.body.weight(.medium))
                        .foregroundStyle(.primary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color(.secondarySystemGroupedBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }
            }

            if viewModel.currentStage < viewModel.totalStages {
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        viewModel.advance()
                    }
                } label: {
                    Text("Next")
                        .font(.body.weight(.semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(
                            viewModel.canAdvance() ? theme.primary : Color(.systemGray3),
                            in: RoundedRectangle(cornerRadius: 14)
                        )
                }
                .disabled(!viewModel.canAdvance())
            }
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 8)
    }
}
