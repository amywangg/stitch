import SwiftUI

struct ProjectOptionsView: View {
    @Bindable var viewModel: AIPatternBuilderViewModel
    @Environment(ThemeManager.self) private var theme
    @State private var showAdvanced = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                let questions = viewModel.visibleQuestions()
                let grouped = groupQuestions(questions)

                ForEach(Array(grouped.enumerated()), id: \.offset) { _, group in
                    VStack(alignment: .leading, spacing: 16) {
                        if let header = group.header {
                            Text(header)
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.secondary)
                                .textCase(.uppercase)
                                .padding(.horizontal, 20)
                        }

                        ForEach(group.questions) { question in
                            questionView(question)
                        }
                    }
                }

                // Advanced section
                advancedSection
            }
            .padding(.vertical, 16)
        }
    }

    // MARK: - Question Rendering

    @ViewBuilder
    private func questionView(_ question: BuilderQuestion) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(question.label)
                .font(.subheadline.weight(.medium))
                .padding(.horizontal, 20)

            switch question.type {
            case "single_select":
                if let options = question.options {
                    singleSelectView(question: question, options: options)
                }
            case "boolean":
                booleanView(question: question)
            case "number_input":
                numberInputView(question: question)
            default:
                EmptyView()
            }
        }
    }

    @ViewBuilder
    private func singleSelectView(question: BuilderQuestion, options: [BuilderQuestionOption]) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(options) { option in
                    BuilderOptionPill(
                        option: option,
                        isSelected: viewModel.answers[question.key] == option.value
                    ) {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            viewModel.answers[question.key] = option.value
                        }
                    }
                }
            }
            .padding(.horizontal, 20)
        }

        // Show description of selected option
        if let selected = viewModel.answers[question.key],
           let option = options.first(where: { $0.value == selected }),
           let desc = option.description {
            Text(desc)
                .font(.caption)
                .foregroundStyle(.secondary)
                .padding(.horizontal, 20)
        }
    }

    private func booleanView(question: BuilderQuestion) -> some View {
        Toggle(
            isOn: Binding(
                get: { viewModel.answers[question.key] == "true" },
                set: { viewModel.answers[question.key] = $0 ? "true" : "false" }
            )
        ) {
            EmptyView()
        }
        .padding(.horizontal, 20)
    }

    private func numberInputView(question: BuilderQuestion) -> some View {
        TextField(
            question.label,
            text: Binding(
                get: { viewModel.answers[question.key] ?? "" },
                set: { viewModel.answers[question.key] = $0 }
            )
        )
        .keyboardType(.decimalPad)
        .textFieldStyle(.roundedBorder)
        .padding(.horizontal, 20)
    }

    // MARK: - Advanced

    private var advancedSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    showAdvanced.toggle()
                }
            } label: {
                HStack {
                    Text("Advanced options")
                        .font(.subheadline.weight(.medium))
                    Spacer()
                    Image(systemName: showAdvanced ? "chevron.up" : "chevron.down")
                        .font(.caption)
                }
                .foregroundStyle(.secondary)
                .padding(.horizontal, 20)
            }
            .buttonStyle(.plain)

            if showAdvanced {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Needle size (mm)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    TextField("Auto", text: $viewModel.needleSizeOverride)
                        .keyboardType(.decimalPad)
                        .textFieldStyle(.roundedBorder)

                    Text("Gauge override")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    HStack(spacing: 12) {
                        TextField("Stitches/10cm", text: $viewModel.gaugeStitchesOverride)
                            .keyboardType(.decimalPad)
                            .textFieldStyle(.roundedBorder)
                        TextField("Rows/10cm", text: $viewModel.gaugeRowsOverride)
                            .keyboardType(.decimalPad)
                            .textFieldStyle(.roundedBorder)
                    }
                }
                .padding(.horizontal, 20)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .padding(.vertical, 12)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .padding(.horizontal, 20)
    }

    // MARK: - Grouping

    private struct QuestionGroup {
        let header: String?
        let questions: [BuilderQuestion]
    }

    private func groupQuestions(_ questions: [BuilderQuestion]) -> [QuestionGroup] {
        // Group into chunks of 5 for readability
        if questions.count <= 5 {
            return [QuestionGroup(header: nil, questions: questions)]
        }
        var groups: [QuestionGroup] = []
        let mid = questions.count / 2
        groups.append(QuestionGroup(header: "Design", questions: Array(questions.prefix(mid))))
        groups.append(QuestionGroup(header: "Details", questions: Array(questions.suffix(from: mid))))
        return groups
    }
}
