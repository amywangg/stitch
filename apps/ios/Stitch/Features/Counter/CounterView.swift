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
    @State private var voiceManager = VoiceCounterManager()
    @State private var voiceFeedback: String?
    @State private var showVoiceHelp = false
    @State private var showCastOnMode = false
    @State private var showProPaywall = false
    @Environment(SubscriptionManager.self) private var subscriptions

    private var sessionManager: CraftingSessionManager { CraftingSessionManager.shared }

    var body: some View {
        ZStack {
            VStack(spacing: 0) {
                // Session bar
                sessionBar

                if viewModel.totalSteps > 0 {
                    CounterInstructionLayout(viewModel: viewModel)
                } else {
                    basicLayout
                }
            }

            // Milestone celebration overlay
            if let milestone = viewModel.milestoneToShow {
                MilestoneCelebration(row: milestone)
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                            viewModel.milestoneToShow = nil
                        }
                    }
                    .allowsHitTesting(false)
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

            // Wire voice commands
            voiceManager.onCommand = { command in
                Task { @MainActor in
                    await handleVoiceCommand(command)
                }
            }
        }
        .errorAlert(error: $viewModel.error)
        // Voice feedback toast
        .overlay(alignment: .top) {
            if let feedback = voiceFeedback {
                Text(feedback)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(.black.opacity(0.7), in: Capsule())
                    .padding(.top, 8)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                            withAnimation { voiceFeedback = nil }
                        }
                    }
            }
        }
        .animation(.easeInOut(duration: 0.2), value: voiceFeedback)
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
        .fullScreenCover(isPresented: $showCastOnMode) {
            CastOnModeView(voiceManager: voiceManager)
        }
        .onAppear {
            viewVisible = true
            // Keep screen awake during active session
            UIApplication.shared.isIdleTimerDisabled = sessionManager.hasActiveSession
        }
        .onDisappear {
            viewVisible = false
            stopTimer()
            voiceManager.stopListening()
            UIApplication.shared.isIdleTimerDisabled = false
        }
        .onChange(of: scenePhase) { oldPhase, newPhase in
            guard sessionManager.hasActiveSession else { return }
            if newPhase == .background {
                stopTimer()
                voiceManager.stopListening()
                UIApplication.shared.isIdleTimerDisabled = false
                Task { await sessionManager.pauseSession() }
            } else if newPhase == .active, oldPhase == .background {
                startTimer()
                UIApplication.shared.isIdleTimerDisabled = true
                Task { await sessionManager.resumeSession() }
                // Auto-resume voice if it was active
                if voiceManager.isListening {
                    Task { await voiceManager.startListening() }
                }
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
                    UIApplication.shared.isIdleTimerDisabled = false
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
                        UIApplication.shared.isIdleTimerDisabled = true
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

    // MARK: - Basic layout (no instructions)

    private var basicLayout: some View {
        VStack(spacing: 0) {
            // AI parse banner — shown when no instructions and PDF available
            if viewModel.totalSteps == 0, pdfUploadId != nil || viewModel.pdfUploadId != nil {
                aiParseBanner
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
            }

            Spacer()

            if viewModel.sectionCompleted {
                VStack(spacing: 16) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 64))
                        .foregroundStyle(.green)
                    Text("Section complete")
                        .font(.title2.weight(.semibold))

                    CounterSectionCompleteFooter(viewModel: viewModel)
                }
                .padding(.horizontal)
            } else if let target = viewModel.targetRows, target > 0 {
                ProgressRingView(progress: viewModel.progress, color: theme.primary) {
                    Text("\(viewModel.currentRow)")
                        .font(.system(size: 64, weight: .bold, design: .rounded))
                }
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

            // Quick-glance stats card
            statsCard
                .padding(.horizontal)
                .padding(.top, 12)

            Spacer()

            if !viewModel.sectionCompleted {
                CounterControls(viewModel: viewModel)
                    .padding(.horizontal)
                    .padding(.bottom, 20)
            }
        }
    }

    // MARK: - AI Parse Banner

    private var aiParseBanner: some View {
        Button {
            if subscriptions.isPro {
                // TODO: trigger AI parse of this section's PDF
                viewModel.error = "AI parsing coming soon"
            } else {
                showProPaywall = true
            }
        } label: {
            HStack(spacing: 10) {
                Image(systemName: "sparkles")
                    .font(.body)
                    .foregroundStyle(theme.primary)
                VStack(alignment: .leading, spacing: 2) {
                    Text("AI parse pattern")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.primary)
                    Text("Get step-by-step row instructions")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if !subscriptions.isPro {
                    Text("Pro")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(theme.primary, in: Capsule())
                }
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
            .padding(12)
            .background(theme.primary.opacity(0.06), in: RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $showProPaywall) {
            StitchPaywallView()
        }
    }


    // MARK: - Stats Card

    @ViewBuilder
    private var statsCard: some View {
        let showStats = viewModel.targetRows != nil || viewModel.rowsPerHour != nil

        if showStats && !viewModel.sectionCompleted {
            HStack(spacing: 20) {
                // Section progress
                if let target = viewModel.targetRows, target > 0 {
                    statItem(
                        label: "Progress",
                        value: "\(Int(viewModel.progress * 100))%"
                    )
                }

                // Rows per hour
                if let rph = viewModel.rowsPerHour {
                    statItem(
                        label: "Rows/hr",
                        value: "\(Int(rph))"
                    )
                }

                // Remaining
                if let target = viewModel.targetRows, target > 0 {
                    let remaining = max(target - viewModel.currentRow, 0)
                    statItem(
                        label: "Remaining",
                        value: "\(remaining)"
                    )
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private func statItem(label: String, value: String) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.subheadline.weight(.semibold).monospacedDigit())
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Toolbar

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            HStack(spacing: 12) {
                // Voice help
                if voiceManager.isListening {
                    Button { showVoiceHelp = true } label: {
                        Image(systemName: "questionmark.circle")
                            .foregroundStyle(.secondary)
                    }
                    .popover(isPresented: $showVoiceHelp) {
                        VoiceCommandHelpView()
                    }
                }

                // Hands-free voice toggle
                Button {
                    Task {
                        if voiceManager.isListening {
                            voiceManager.stopListening()
                        } else {
                            await voiceManager.startListening()
                            UIApplication.shared.isIdleTimerDisabled = true
                        }
                    }
                } label: {
                    Image(systemName: voiceManager.isListening ? "mic.fill" : "mic")
                        .foregroundStyle(voiceManager.isListening ? Color(hex: "#FF6B6B") : .secondary)
                        .symbolEffect(.pulse, isActive: voiceManager.isListening)
                }

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

    // MARK: - Voice Command Handler

    private func handleVoiceCommand(_ command: VoiceCommand) async {
        switch command {
        case .increment:
            await viewModel.increment()
            showVoiceFeedback("+1")
        case .decrement:
            await viewModel.decrement()
            showVoiceFeedback("-1")
        case .undo:
            await viewModel.undo()
            showVoiceFeedback("Undone")
        case .advanceStep:
            await viewModel.advanceStep()
            showVoiceFeedback("Next step")
        case .queryStatus:
            let status = viewModel.spokenStatus
            voiceManager.speak(status)
            showVoiceFeedback(status)
        case .startSession:
            if !sessionManager.hasActiveSession {
                await sessionManager.startSession(projectId: projectId)
                startTimer()
                UIApplication.shared.isIdleTimerDisabled = true
                showVoiceFeedback("Session started")
            }
        case .pauseSession:
            if sessionManager.hasActiveSession {
                stopTimer()
                await sessionManager.pauseSession()
                showVoiceFeedback("Session paused")
            }
        case .stopSession:
            if sessionManager.hasActiveSession {
                stopTimer()
                UIApplication.shared.isIdleTimerDisabled = false
                await sessionManager.endSession()
                showVoiceFeedback("Session ended")
            }
        case .castOn:
            showCastOnMode = true
            showVoiceFeedback("Cast-on mode")
        }
    }

    private func showVoiceFeedback(_ text: String) {
        withAnimation { voiceFeedback = text }
    }
}
