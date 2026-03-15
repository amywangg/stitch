import SwiftUI

struct CounterView: View {
    let sectionId: String
    var allSections: [SectionRef] = []
    var projectId: String?
    var pdfUploadId: String?

    @Environment(ThemeManager.self) private var theme
    @Environment(\.scenePhase) private var scenePhase
    @State private var viewModel = CounterViewModel()
    @State private var showPdfViewer = false
    @State private var viewVisible = true
    @State private var sessionElapsed: TimeInterval = 0
    @State private var sessionTimer: Timer?

    private var sessionManager: CraftingSessionManager { CraftingSessionManager.shared }

    var body: some View {
        VStack(spacing: 0) {
            // Session bar
            sessionBar

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
        .onAppear { viewVisible = true }
        .onDisappear {
            viewVisible = false
            stopTimer()
        }
        .onChange(of: scenePhase) { oldPhase, newPhase in
            guard sessionManager.hasActiveSession else { return }
            if newPhase == .background {
                stopTimer()
                Task { await sessionManager.pauseSession() }
            } else if newPhase == .active, oldPhase == .background {
                startTimer()
                Task { await sessionManager.resumeSession() }
            }
        }
    }

    // MARK: - Session Bar

    @ViewBuilder
    private var sessionBar: some View {
        if sessionManager.hasActiveSession {
            HStack(spacing: 10) {
                // Live indicator
                Circle()
                    .fill(.red)
                    .frame(width: 8, height: 8)

                Text(formattedElapsed)
                    .font(.subheadline.weight(.medium).monospacedDigit())

                Spacer()

                Button {
                    stopTimer()
                    Task { await sessionManager.endSession() }
                } label: {
                    Text("End session")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(.red.opacity(0.8), in: Capsule())
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Color(.secondarySystemGroupedBackground))
        } else {
            HStack {
                Button {
                    Task {
                        await sessionManager.startSession(projectId: projectId)
                        startTimer()
                    }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "clock")
                            .font(.caption)
                        Text("Start timed session")
                            .font(.caption.weight(.medium))
                    }
                    .foregroundStyle(theme.primary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(theme.primary.opacity(0.1), in: Capsule())
                }
                .buttonStyle(.plain)

                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
        }
    }

    private var formattedElapsed: String {
        let mins = Int(sessionElapsed) / 60
        let secs = Int(sessionElapsed) % 60
        return String(format: "%d:%02d", mins, secs)
    }

    private func startTimer() {
        sessionElapsed = 0
        sessionTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            sessionElapsed += 1
        }
    }

    private func stopTimer() {
        sessionTimer?.invalidate()
        sessionTimer = nil
    }

    // MARK: - Instruction-aware layout

    private var instructionLayout: some View {
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
                }
                .padding(.vertical, 12)
            }

            Spacer(minLength: 0)

            if viewModel.sectionCompleted {
                // Section complete — show next section button or done message
                sectionCompleteFooter
                    .padding(.horizontal)
                    .padding(.bottom, 8)
            } else {
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
            }

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

            if viewModel.sectionCompleted {
                VStack(spacing: 16) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 64))
                        .foregroundStyle(.green)
                    Text("Section complete")
                        .font(.title2.weight(.semibold))

                    sectionCompleteFooter
                }
                .padding(.horizontal)
            } else if let target = viewModel.targetRows, target > 0 {
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

            if !viewModel.sectionCompleted {
                counterControls
                    .padding(.horizontal)
                    .padding(.bottom, 20)
            }
        }
    }

    // MARK: - Section Complete Footer

    private var sectionCompleteFooter: some View {
        VStack(spacing: 12) {
            if let next = viewModel.nextSection {
                Button {
                    Task { await viewModel.switchSection(next) }
                } label: {
                    HStack(spacing: 8) {
                        Text("Next: \(next.name)")
                            .font(.subheadline.weight(.semibold))
                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(theme.primary)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .buttonStyle(.plain)
            } else {
                HStack(spacing: 8) {
                    Image(systemName: "party.popper.fill")
                    Text("All sections done")
                        .font(.subheadline.weight(.medium))
                }
                .foregroundStyle(.green)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(.green.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }

            // Still let user go back if they need to
            Button {
                Task { await viewModel.decrement() }
            } label: {
                Text("Go back a row")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
            .padding(.bottom, 4)
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
            return viewModel.sectionCompleted ? theme.primary : theme.primary.opacity(0.6)
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
                if !viewModel.sectionCompleted {
                    Button("Undo") {
                        Task { await viewModel.undo() }
                    }
                    .disabled(viewModel.currentRow == 0)
                }

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
