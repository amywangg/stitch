import SwiftUI

// MARK: - Counter Instruction Layout

struct CounterInstructionLayout: View {
    let viewModel: CounterViewModel
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        VStack(spacing: 0) {
            // Completed banner
            if viewModel.sectionCompleted {
                VStack(spacing: 12) {
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark.circle.fill")
                        Text("Section complete")
                            .font(.subheadline.weight(.medium))
                    }
                    .foregroundStyle(.green)
                }
                .padding(.vertical, 8)
            }

            // Step progress strip with navigation
            HStack(spacing: 12) {
                Button {
                    Task { await viewModel.goBackStep() }
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.body.weight(.semibold))
                        .foregroundStyle(viewModel.canGoBack ? theme.primary : Color(.systemGray4))
                        .frame(width: 36, height: 36)
                        .background(viewModel.canGoBack ? theme.primary.opacity(0.12) : Color.clear)
                        .clipShape(Circle())
                }
                .disabled(!viewModel.canGoBack)

                stepProgressStrip
                    .frame(maxWidth: .infinity)

                Button {
                    Task { await viewModel.advanceStep() }
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.body.weight(.semibold))
                        .foregroundStyle(viewModel.canGoForward ? theme.primary : Color(.systemGray4))
                        .frame(width: 36, height: 36)
                        .background(viewModel.canGoForward ? theme.primary.opacity(0.12) : Color.clear)
                        .clipShape(Circle())
                }
                .disabled(!viewModel.canGoForward)
            }
            .padding(.horizontal)
            .padding(.top, 8)

            ScrollView {
                VStack(spacing: 16) {
                    // Context: previous step
                    if let prev = viewModel.previousInstruction {
                        contextPeek(prev, label: "Previous")
                    }

                    // Instruction card
                    instructionCard
                        .padding(.horizontal)

                    // Glossary terms found in current instruction
                    glossaryTermsSection
                        .padding(.horizontal)

                    // Context: next step
                    if let next = viewModel.nextInstruction {
                        contextPeek(next, label: "Next")
                    }

                    // Position label
                    positionLabel
                        .padding(.horizontal)

                    // Quick stats
                    statsRow
                        .padding(.horizontal)
                }
                .padding(.vertical, 12)
            }

            Spacer(minLength: 0)

            if viewModel.sectionCompleted {
                // Section complete — show next section button or done message
                CounterSectionCompleteFooter(viewModel: viewModel)
                    .padding(.horizontal)
                    .padding(.bottom, 8)
            } else {
                // Counter display with progress ring
                counterDisplay
                    .padding(.bottom, 4)

                // Controls
                CounterControls(viewModel: viewModel)
                    .padding(.horizontal)
                    .padding(.bottom, 8)
            }

            // Section progress bar
            if let progress = viewModel.sectionProgress, progress.totalSteps > 0 {
                sectionProgressBar(pct: Double(progress.overallPct ?? 0) / 100.0)
            }
        }
    }

    // MARK: - Counter Display

    @ViewBuilder
    private var counterDisplay: some View {
        if let target = viewModel.targetRows, target > 0 {
            ProgressRingView(
                progress: viewModel.progress,
                color: theme.primary,
                lineWidth: 6,
                size: 80
            ) {
                Text("\(viewModel.currentRow)")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(theme.primary)
            }

            Text("of \(target) rows")
                .font(.caption)
                .foregroundStyle(.secondary)
        } else {
            Text("\(viewModel.currentRow)")
                .font(.system(size: 48, weight: .bold, design: .rounded))
                .foregroundStyle(theme.primary)
        }
    }

    // MARK: - Step Progress Strip

    private var stepProgressStrip: some View {
        VStack(spacing: 6) {
            HStack(spacing: 3) {
                ForEach(1...max(viewModel.totalSteps, 1), id: \.self) { step in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(stepStripColor(step))
                        .frame(height: 4)
                }
            }

            Text("Step \(viewModel.currentStep) of \(viewModel.totalSteps)")
                .font(.caption2.weight(.medium))
                .foregroundStyle(.secondary)
        }
    }

    private func stepStripColor(_ step: Int) -> Color {
        if step < viewModel.currentStep {
            return theme.primary
        } else if step == viewModel.currentStep {
            // Color-code by row type when on the current step
            if let rowType = viewModel.rowType {
                return viewModel.sectionCompleted ? theme.primary : stepTypeColor(rowType).opacity(0.8)
            }
            return viewModel.sectionCompleted ? theme.primary : theme.primary.opacity(0.6)
        } else {
            return Color(.systemGray4)
        }
    }

    // MARK: - Instruction Card

    private var instructionCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Row type badge — color-coded
            if let rowType = viewModel.rowType {
                let badgeColor = stepTypeColor(rowType)
                Text(stepTypeLabel(rowType))
                    .font(.caption2.weight(.semibold))
                    .textCase(.uppercase)
                    .foregroundStyle(badgeColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(badgeColor.opacity(0.12), in: Capsule())
            }

            // Instruction text (glossary terms highlighted)
            GlossaryLinkedText(text: viewModel.instructionText)
                .font(.body)
                .fixedSize(horizontal: false, vertical: true)

            // Stitch count
            if let count = viewModel.stitchCount {
                HStack(spacing: 4) {
                    Image(systemName: "number")
                        .font(.caption2)
                    Text("\(count) stitches")
                        .font(.caption)
                }
                .foregroundStyle(.secondary)
            }

            // Target measurement for work_to_measurement steps
            if let cm = viewModel.targetMeasurementCm, cm > 0 {
                let inches = cm / 2.54
                HStack(spacing: 6) {
                    Image(systemName: "ruler")
                        .font(.caption2)
                    Text("Work to \(String(format: "%.1f", cm)) cm / \(String(format: "%.1f", inches))\"")
                        .font(.subheadline.weight(.medium))
                }
                .foregroundStyle(Color(hex: "#4ECDC4"))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(hex: "#4ECDC4").opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
            }

            // Open-ended: manual advance button
            if viewModel.isOpenEnded && !viewModel.sectionCompleted {
                Button {
                    Task { await viewModel.advanceStep() }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark.circle")
                            .font(.subheadline)
                        Text("Done with this step")
                            .font(.subheadline.weight(.medium))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color(hex: "#4ECDC4").opacity(0.15))
                    .foregroundStyle(Color(hex: "#4ECDC4"))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Glossary Terms Section

    @ViewBuilder
    private var glossaryTermsSection: some View {
        let linkedText = GlossaryLinkedText(text: viewModel.instructionText)
        let terms = linkedText.foundTerms()

        if !terms.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text("Glossary")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)

                FlowLayout(spacing: 6) {
                    ForEach(terms, id: \.id) { term in
                        GlossaryTermChip(term: term)
                    }
                }
            }
        }
    }

    // MARK: - Stats Row

    @ViewBuilder
    private var statsRow: some View {
        let hasStats = viewModel.rowsPerHour != nil || (viewModel.sectionProgress?.overallPct != nil)

        if hasStats && !viewModel.sectionCompleted {
            HStack(spacing: 16) {
                if let pct = viewModel.sectionProgress?.overallPct {
                    HStack(spacing: 4) {
                        Image(systemName: "chart.bar.fill")
                            .font(.caption2)
                        Text("\(pct)% complete")
                            .font(.caption)
                    }
                    .foregroundStyle(.secondary)
                }

                if let rph = viewModel.rowsPerHour {
                    HStack(spacing: 4) {
                        Image(systemName: "speedometer")
                            .font(.caption2)
                        Text("\(Int(rph)) rows/hr")
                            .font(.caption)
                    }
                    .foregroundStyle(.secondary)
                }

                Spacer()
            }
        }
    }

    // MARK: - Context Peek

    private func contextPeek(_ text: String, label: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption2.weight(.medium))
                .foregroundStyle(.tertiary)
            Text(text)
                .font(.caption)
                .foregroundStyle(.tertiary)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal)
    }

    // MARK: - Position Label

    private var positionLabel: some View {
        Group {
            if let label = viewModel.stepLabel {
                Text(label)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - Section Progress Bar

    private func sectionProgressBar(pct: Double) -> some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Rectangle().fill(Color(.systemGray5))
                Rectangle()
                    .fill(theme.primary)
                    .frame(width: proxy.size.width * min(pct, 1.0))
            }
        }
        .frame(height: 3)
    }
}
