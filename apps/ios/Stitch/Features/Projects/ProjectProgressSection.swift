import SwiftUI

// MARK: - Manual Progress Slider

/// Shown on non-parsed projects so users can manually set their completion percentage.
/// Single custom track slider — no redundant progress bar.
struct ProjectManualProgressSlider: View {
    let progressPct: Int
    let onChange: (Int) -> Void

    @Environment(ThemeManager.self) private var theme
    @State private var sliderValue: Double = 0
    @State private var isDragging = false
    @State private var debounceTask: Task<Void, Never>?

    var body: some View {
        VStack(spacing: 14) {
            // Drag to adjust — custom track
            GeometryReader { proxy in
                let trackWidth = proxy.size.width
                let fillWidth = trackWidth * sliderValue / 100

                ZStack(alignment: .leading) {
                    // Track background
                    Capsule()
                        .fill(Color(.systemGray5))
                        .frame(height: 10)

                    // Filled portion
                    Capsule()
                        .fill(theme.primary)
                        .frame(width: max(fillWidth, 0), height: 10)
                        .animation(.easeOut(duration: 0.15), value: sliderValue)
                }
                .frame(height: 10)
                .frame(maxHeight: .infinity, alignment: .center)
                .contentShape(Rectangle())
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { value in
                            isDragging = true
                            let pct = min(max(value.location.x / trackWidth * 100, 0), 100)
                            sliderValue = (pct / 5).rounded() * 5 // snap to 5%
                        }
                        .onEnded { _ in
                            isDragging = false
                            debounceTask?.cancel()
                            debounceTask = Task {
                                try? await Task.sleep(for: .milliseconds(300))
                                guard !Task.isCancelled else { return }
                                onChange(Int(sliderValue))
                            }
                        }
                )
            }
            .frame(height: 32)

            // Label row
            HStack {
                Text("\(Int(sliderValue))% complete")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(theme.primary)
                    .contentTransition(.numericText())
                    .animation(.easeInOut(duration: 0.15), value: Int(sliderValue))
                Spacer()
                if isDragging {
                    Text("Release to save")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                        .transition(.opacity)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .onAppear {
            sliderValue = Double(progressPct)
        }
    }
}

// MARK: - Master Progress Card

struct ProjectMasterProgressCard: View {
    let sections: [ProjectSection]
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        let completedCount = sections.filter { $0.completed == true }.count
        let totalPct = masterProgressPct(sections)
        let activeSection = sections.first { $0.completed != true }

        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("\(Int(totalPct * 100))%")
                    .font(.title2.weight(.bold))
                    .foregroundStyle(theme.primary)
                Spacer()
                Text("\(completedCount) of \(sections.count) sections complete")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            // Segmented progress bar
            GeometryReader { proxy in
                HStack(spacing: 2) {
                    ForEach(sections) { section in
                        let weight = sectionWeight(section, totalSections: sections)
                        let sectionPct = sectionCompletionPct(section)
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(Color(.systemGray5))
                            RoundedRectangle(cornerRadius: 2)
                                .fill(section.completed == true ? theme.primary : theme.primary.opacity(0.6))
                                .frame(width: (proxy.size.width * weight - 2) * sectionPct)
                        }
                        .frame(width: proxy.size.width * weight - 2)
                    }
                }
            }
            .frame(height: 6)

            if let active = activeSection {
                Text("Active: \(active.name)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Progress Calculations

    private func masterProgressPct(_ sections: [ProjectSection]) -> Double {
        let totalTarget = sections.reduce(0) { $0 + ($1.targetRows ?? 1) }
        guard totalTarget > 0 else { return 0 }
        let totalDone = sections.reduce(0) { sum, s in
            let target = s.targetRows ?? 1
            if s.completed == true { return sum + target }
            return sum + min(s.currentRow, target)
        }
        return Double(totalDone) / Double(totalTarget)
    }

    private func sectionWeight(_ section: ProjectSection, totalSections: [ProjectSection]) -> Double {
        let totalTarget = totalSections.reduce(0) { $0 + ($1.targetRows ?? 1) }
        guard totalTarget > 0 else { return 1.0 / Double(totalSections.count) }
        return Double(section.targetRows ?? 1) / Double(totalTarget)
    }

    private func sectionCompletionPct(_ section: ProjectSection) -> Double {
        if section.completed == true { return 1.0 }

        // For multi-step sections, calculate progress across all steps
        if let ps = section.patternSection, let rows = ps.rows, !rows.isEmpty {
            let currentStep = section.currentStep ?? 1
            let sortedRows = rows.sorted { $0.rowNumber < $1.rowNumber }
            let totalSteps = sortedRows.count

            // Steps fully completed (before current step)
            let stepsCompleted = max(0, currentStep - 1)

            // Progress within current step
            let currentStepRows = sortedRows.first(where: { $0.rowNumber == currentStep })?.rowsInStep
            let withinStepPct: Double
            if let stepTarget = currentStepRows, stepTarget > 0 {
                withinStepPct = min(Double(section.currentRow) / Double(stepTarget), 1.0)
            } else {
                // Open-ended step — count it as 0 progress within the step
                withinStepPct = section.currentRow > 0 ? 0.5 : 0
            }

            guard totalSteps > 0 else { return 0 }
            return (Double(stepsCompleted) + withinStepPct) / Double(totalSteps)
        }

        // Simple: just row-based progress
        let target = section.targetRows ?? 1
        guard target > 0 else { return 0 }
        return min(Double(section.currentRow) / Double(target), 1.0)
    }
}

// MARK: - Section Progress Donut

struct ProjectSectionProgressDonut: View {
    let section: ProjectSection
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        let isComplete = section.completed == true
        let pct = sectionCompletionPct(section)

        ZStack {
            Circle()
                .stroke(Color(.systemGray4), lineWidth: 3)
            Circle()
                .trim(from: 0, to: isComplete ? 1.0 : pct)
                .stroke(
                    isComplete ? Color.green : theme.primary,
                    style: StrokeStyle(lineWidth: 3, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            if isComplete {
                Image(systemName: "checkmark")
                    .font(.caption2.bold())
                    .foregroundStyle(.green)
            } else if pct > 0 {
                Text("\(Int(pct * 100))")
                    .font(.system(size: 8, weight: .bold, design: .rounded))
                    .foregroundStyle(.secondary)
            }
        }
        .frame(width: 32, height: 32)
    }

    private func sectionCompletionPct(_ section: ProjectSection) -> Double {
        if section.completed == true { return 1.0 }

        if let ps = section.patternSection, let rows = ps.rows, !rows.isEmpty {
            let currentStep = section.currentStep ?? 1
            let sortedRows = rows.sorted { $0.rowNumber < $1.rowNumber }
            let totalSteps = sortedRows.count
            let stepsCompleted = max(0, currentStep - 1)
            let currentStepRows = sortedRows.first(where: { $0.rowNumber == currentStep })?.rowsInStep
            let withinStepPct: Double
            if let stepTarget = currentStepRows, stepTarget > 0 {
                withinStepPct = min(Double(section.currentRow) / Double(stepTarget), 1.0)
            } else {
                withinStepPct = section.currentRow > 0 ? 0.5 : 0
            }
            guard totalSteps > 0 else { return 0 }
            return (Double(stepsCompleted) + withinStepPct) / Double(totalSteps)
        }

        let target = section.targetRows ?? 1
        guard target > 0 else { return 0 }
        return min(Double(section.currentRow) / Double(target), 1.0)
    }
}

// MARK: - Sections Block

struct ProjectSectionsBlock: View {
    let sections: [ProjectSection]
    let projectId: String?
    let pdfUploadId: String?
    @Environment(ThemeManager.self) private var theme
    @Environment(AppRouter.self) private var router

    var body: some View {
        let refs = sectionRefs(sections)
        let activeId = sections.first(where: { $0.completed != true })?.id

        VStack(alignment: .leading, spacing: 8) {
            Text("Sections").font(.headline)
            ForEach(sections) { section in
                let isActive = section.id == activeId
                Button {
                    router.push(.counter(
                        sectionId: section.id,
                        allSections: refs,
                        projectId: projectId,
                        pdfUploadId: pdfUploadId
                    ))
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(section.name)
                                .font(.subheadline.weight(.medium))
                            Text("Row \(section.currentRow)\(section.targetRows.map { " of \($0)" } ?? "")")
                                .font(.caption).foregroundStyle(.secondary)
                            if let step = section.currentStep, let ps = section.patternSection,
                               let rows = ps.rows, !rows.isEmpty {
                                Text("Step \(step) of \(rows.count)")
                                    .font(.caption2).foregroundStyle(.tertiary)
                            }
                        }
                        Spacer()
                        ProjectSectionProgressDonut(section: section)
                        Image(systemName: "chevron.right").font(.caption).foregroundStyle(.tertiary)
                    }
                    .padding(12)
                    .background(
                        isActive
                            ? theme.primary.opacity(0.08)
                            : Color(.secondarySystemGroupedBackground)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .overlay(
                        isActive
                            ? RoundedRectangle(cornerRadius: 10).stroke(theme.primary.opacity(0.3), lineWidth: 1)
                            : nil
                    )
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func sectionRefs(_ sections: [ProjectSection]) -> [SectionRef] {
        sections.map { SectionRef(id: $0.id, name: $0.name) }
    }
}

// MARK: - Row Counters Block

struct ProjectRowCountersBlock: View {
    let counters: [ProjectSection]
    let allSections: [ProjectSection]
    let projectId: String
    let pdfUploadId: String?
    let onAdd: () -> Void
    let onDelete: (String) -> Void
    @Environment(ThemeManager.self) private var theme
    @Environment(AppRouter.self) private var router

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Row counters")
                    .font(.headline)
                Spacer()
                Button {
                    onAdd()
                } label: {
                    Image(systemName: "plus.circle")
                        .foregroundStyle(theme.primary)
                }
                .buttonStyle(.plain)
            }

            if counters.isEmpty {
                Button { onAdd() } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                            .foregroundStyle(theme.primary)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Add a row counter")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(.primary)
                            Text("Track rows for any part of your project")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                    }
                    .padding(12)
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .buttonStyle(.plain)
            } else {
                let refs = allSections.map { SectionRef(id: $0.id, name: $0.name) }

                ForEach(counters) { counter in
                    Button {
                        router.push(.counter(
                            sectionId: counter.id,
                            allSections: refs,
                            projectId: projectId,
                            pdfUploadId: pdfUploadId
                        ))
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(counter.name)
                                    .font(.subheadline.weight(.medium))
                                Text("Row \(counter.currentRow)\(counter.targetRows.map { " of \($0)" } ?? "")")
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            counterProgressView(counter)
                            Image(systemName: "chevron.right").font(.caption).foregroundStyle(.tertiary)
                        }
                        .padding(12)
                        .background(Color(.secondarySystemGroupedBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .buttonStyle(.plain)
                    .contextMenu {
                        Button(role: .destructive) {
                            onDelete(counter.id)
                        } label: {
                            Label("Remove counter", systemImage: "trash")
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private func counterProgressView(_ section: ProjectSection) -> some View {
        if section.completed == true {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
        } else if let target = section.targetRows, target > 0 {
            let pct = min(Double(section.currentRow) / Double(target), 1.0)
            ZStack {
                Circle().stroke(Color(.systemGray4), lineWidth: 3)
                Circle()
                    .trim(from: 0, to: pct)
                    .stroke(theme.primary, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text("\(Int(pct * 100))")
                    .font(.system(size: 8, weight: .bold, design: .rounded))
                    .foregroundStyle(.secondary)
            }
            .frame(width: 32, height: 32)
        } else {
            Text("\(section.currentRow)")
                .font(.subheadline.weight(.semibold).monospacedDigit())
                .foregroundStyle(theme.primary)
        }
    }
}

// MARK: - Continue Knitting Button

struct ProjectContinueKnittingButton: View {
    let project: Project
    let sections: [ProjectSection]
    @Environment(ThemeManager.self) private var theme
    @Environment(AppRouter.self) private var router

    var body: some View {
        let activeSection = sections.first { $0.completed != true }
        let refs = sections.map { SectionRef(id: $0.id, name: $0.name) }

        Group {
            if let active = activeSection {
                Button {
                    router.push(.counter(
                        sectionId: active.id,
                        allSections: refs,
                        projectId: project.id,
                        pdfUploadId: project.pdfUploadId
                    ))
                } label: {
                    Text("Continue knitting")
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(theme.primary)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                }
                .padding(.horizontal)
                .padding(.bottom, 8)
                .background(
                    LinearGradient(
                        colors: [Color(.systemBackground).opacity(0), Color(.systemBackground)],
                        startPoint: .top,
                        endPoint: .center
                    )
                )
            }
        }
    }
}
