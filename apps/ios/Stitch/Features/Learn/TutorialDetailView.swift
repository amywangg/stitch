import SwiftUI

struct TutorialDetailView: View {
    let tutorialId: String
    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = TutorialDetailViewModel()

    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let tutorial = viewModel.tutorial {
                scrollContent(tutorial)
            } else {
                ContentUnavailableView("Tutorial not found", systemImage: "book.closed")
            }
        }
        .navigationTitle(viewModel.tutorial?.title ?? "Tutorial")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if viewModel.tutorial?.steps?.isEmpty == false {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Mark all done") {
                        viewModel.markAllComplete()
                    }
                }
            }
        }
        .task { await viewModel.load(tutorialId: tutorialId) }
        .alert("Error", isPresented: .init(
            get: { viewModel.error != nil },
            set: { if !$0 { viewModel.error = nil } }
        )) {
            Button("OK") { viewModel.error = nil }
        } message: {
            Text(viewModel.error ?? "")
        }
    }

    // MARK: - Content

    private func scrollContent(_ tutorial: Tutorial) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                VStack(alignment: .leading, spacing: 6) {
                    Text(tutorial.title)
                        .font(.title2.weight(.bold))

                    if let description = tutorial.description {
                        Text(description)
                            .font(.body)
                            .foregroundStyle(.secondary)
                    }

                    HStack(spacing: 12) {
                        Label(tutorial.difficulty.capitalized, systemImage: "chart.bar")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        if let stepCount = tutorial.steps?.count {
                            Label("\(stepCount) steps", systemImage: "list.number")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                // Progress bar
                if !viewModel.completedSteps.isEmpty {
                    VStack(spacing: 4) {
                        ProgressView(value: viewModel.completionPct)
                            .tint(theme.primary)
                        Text("\(Int(viewModel.completionPct * 100))% complete")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }

                // Steps
                if let steps = tutorial.steps {
                    VStack(alignment: .leading, spacing: 16) {
                        ForEach(steps) { step in
                            stepCard(step)
                        }
                    }
                }
            }
            .padding()
        }
    }

    // MARK: - Step Card

    private func stepCard(_ step: TutorialStep) -> some View {
        let isCompleted = viewModel.completedSteps.contains(step.stepNumber)

        return VStack(alignment: .leading, spacing: 10) {
            // Step header
            HStack(spacing: 10) {
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        viewModel.toggleStep(step.stepNumber)
                    }
                } label: {
                    Image(systemName: isCompleted ? "checkmark.circle.fill" : "circle")
                        .font(.title3)
                        .foregroundStyle(isCompleted ? theme.primary : Color(.systemGray3))
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("Step \(step.stepNumber)")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .textCase(.uppercase)
                    Text(step.title)
                        .font(.subheadline.weight(.semibold))
                }
            }

            // Content
            GlossaryLinkedText(text: step.content)
                .font(.body)
                .foregroundStyle(.secondary)
                .padding(.leading, 40)

            // Video link
            if let videoUrl = step.videoUrl, let url = URL(string: videoUrl) {
                Link(destination: url) {
                    HStack(spacing: 6) {
                        Image(systemName: "play.circle.fill")
                            .font(.subheadline)
                        Text("Watch video")
                            .font(.caption.weight(.medium))
                    }
                    .foregroundStyle(theme.primary)
                    .padding(.leading, 40)
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            isCompleted ? theme.primary.opacity(0.05) : Color(.secondarySystemGroupedBackground)
        )
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
