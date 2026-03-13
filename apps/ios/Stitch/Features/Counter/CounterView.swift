import SwiftUI

struct CounterView: View {
    let sectionId: String
    var allSections: [SectionRef] = []
    var projectId: String?
    var pdfUploadId: String?

    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = CounterViewModel()
    @State private var showPdfViewer = false

    var body: some View {
        VStack(spacing: 0) {
            if viewModel.totalSteps > 0 {
                instructionLayout
            } else {
                basicLayout
            }
        }
        .navigationTitle(viewModel.sectionName.isEmpty ? "Counter" : viewModel.sectionName)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { toolbarContent }
        .task {
            viewModel.allSections = allSections
            viewModel.projectId = projectId
            viewModel.pdfUploadId = pdfUploadId
            await viewModel.load(sectionId: sectionId)
        }
        .alert("Error", isPresented: .init(
            get: { viewModel.error != nil },
            set: { if !$0 { viewModel.error = nil } }
        )) {
            Button("OK") { viewModel.error = nil }
        } message: {
            Text(viewModel.error ?? "")
        }
        .sheet(isPresented: $showPdfViewer) {
            if let pdfId = pdfUploadId ?? viewModel.pdfUploadId {
                NavigationStack {
                    PDFViewerView(pdfUploadId: pdfId, fileName: "Pattern PDF")
                        .toolbar {
                            ToolbarItem(placement: .cancellationAction) {
                                Button("Done") { showPdfViewer = false }
                            }
                        }
                }
            }
        }
    }

    // MARK: - Instruction-aware layout

    private var instructionLayout: some View {
        VStack(spacing: 0) {
            // Step progress strip
            stepProgressStrip
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

                    // Context: next step
                    if let next = viewModel.nextInstruction {
                        contextPeek(next, label: "Next")
                    }

                    // Position label
                    positionLabel
                        .padding(.horizontal)
                }
                .padding(.vertical, 12)
            }

            Spacer(minLength: 0)

            // Counter display
            Text("\(viewModel.currentRow)")
                .font(.system(size: 48, weight: .bold, design: .rounded))
                .foregroundStyle(theme.primary)
                .padding(.bottom, 4)

            if let target = viewModel.targetRows, target > 0 {
                Text("of \(target) rows")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.bottom, 8)
            }

            // Controls
            counterControls
                .padding(.horizontal)
                .padding(.bottom, 8)

            // Section progress bar
            if let progress = viewModel.sectionProgress, progress.totalSteps > 0 {
                sectionProgressBar(pct: Double(progress.overallPct ?? 0) / 100.0)
            }
        }
    }

    // MARK: - Basic layout (no instructions)

    private var basicLayout: some View {
        VStack(spacing: 0) {
            Spacer()

            if let target = viewModel.targetRows, target > 0 {
                ZStack {
                    Circle()
                        .stroke(Color.gray.opacity(0.2), lineWidth: 8)
                    Circle()
                        .trim(from: 0, to: viewModel.progress)
                        .stroke(theme.primary, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    Text("\(viewModel.currentRow)")
                        .font(.system(size: 64, weight: .bold, design: .rounded))
                }
                .frame(width: 200, height: 200)
                .padding()

                Text("of \(target) rows")
                    .font(.title3)
                    .foregroundStyle(.secondary)
                    .padding(.bottom, 8)
            } else {
                Text("\(viewModel.currentRow)")
                    .font(.system(size: 96, weight: .bold, design: .rounded))
                    .foregroundStyle(theme.primary)
            }

            Spacer()

            counterControls
                .padding(.horizontal)
                .padding(.bottom, 20)
        }
    }

    // MARK: - Step Progress Strip

    private var stepProgressStrip: some View {
        VStack(spacing: 6) {
            HStack(spacing: 3) {
                ForEach(1...max(viewModel.totalSteps, 1), id: \.self) { step in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(stepColor(step))
                        .frame(height: 4)
                }
            }

            Text("Step \(viewModel.currentStep) of \(viewModel.totalSteps)")
                .font(.caption2.weight(.medium))
                .foregroundStyle(.secondary)
        }
    }

    private func stepColor(_ step: Int) -> Color {
        if step < viewModel.currentStep {
            return theme.primary
        } else if step == viewModel.currentStep {
            return theme.primary.opacity(0.6)
        } else {
            return Color(.systemGray4)
        }
    }

    // MARK: - Instruction Card

    private var instructionCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Row type badge
            if let rowType = viewModel.rowType {
                Text(rowType.replacingOccurrences(of: "_", with: " "))
                    .font(.caption2.weight(.semibold))
                    .textCase(.uppercase)
                    .foregroundStyle(theme.primary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(theme.primary.opacity(0.12), in: Capsule())
            }

            // Instruction text
            Text(viewModel.instructionText)
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

            // Open-ended: manual advance button
            if viewModel.isOpenEnded {
                Button {
                    Task { await viewModel.advanceStep() }
                } label: {
                    Text("Done with this step")
                        .font(.subheadline.weight(.medium))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color(hex: "#4ECDC4").opacity(0.15))
                        .foregroundStyle(Color(hex: "#4ECDC4"))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
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

    // MARK: - Counter Controls

    private var counterControls: some View {
        HStack(spacing: 16) {
            Button {
                Task { await viewModel.decrement() }
            } label: {
                Image(systemName: "minus")
                    .font(.title2.bold())
                    .frame(width: 72, height: 72)
                    .background(theme.primary.opacity(0.12))
                    .foregroundStyle(theme.primary)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            }

            Button {
                Task { await viewModel.increment() }
            } label: {
                Image(systemName: "plus")
                    .font(.title.bold())
                    .frame(maxWidth: .infinity, minHeight: 72)
                    .background(theme.primary)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
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

    // MARK: - Toolbar

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            HStack(spacing: 12) {
                // PDF button
                if pdfUploadId != nil || viewModel.pdfUploadId != nil {
                    Button {
                        showPdfViewer = true
                    } label: {
                        Image(systemName: "doc.text")
                    }
                }

                // Undo
                Button("Undo") {
                    Task { await viewModel.undo() }
                }
                .disabled(viewModel.currentRow == 0)

                // Section picker
                if allSections.count > 1 {
                    Menu {
                        ForEach(allSections, id: \.id) { section in
                            Button {
                                Task { await viewModel.switchSection(section) }
                            } label: {
                                Label(section.name, systemImage: section.id == sectionId ? "checkmark" : "")
                            }
                        }
                    } label: {
                        Image(systemName: "list.bullet")
                    }
                }
            }
        }
    }
}
