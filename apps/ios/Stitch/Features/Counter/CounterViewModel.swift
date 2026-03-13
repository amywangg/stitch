import Foundation

@Observable
final class CounterViewModel {
    var currentRow: Int = 0
    var targetRows: Int?
    var currentStep: Int = 1
    var totalSteps: Int = 0
    var sectionName: String = ""
    var sectionCompleted: Bool = false

    var instructionText: String = ""
    var stitchCount: Int?
    var rowType: String?
    var isOpenEnded: Bool = false
    var stepLabel: String?

    var sectionProgress: SectionProgress?
    var previousInstruction: String?
    var nextInstruction: String?

    var allSections: [SectionRef] = []
    var projectId: String?
    var pdfUploadId: String?

    var isLoading = false
    var error: String?

    private var sectionId: String = ""
    private var hasInstructions = false

    var progress: Double {
        guard let target = targetRows, target > 0 else { return 0 }
        return min(Double(currentRow) / Double(target), 1.0)
    }

    var overallPct: Int {
        sectionProgress?.overallPct ?? 0
    }

    func load(sectionId: String) async {
        self.sectionId = sectionId
        isLoading = true
        defer { isLoading = false }

        // Try instruction endpoint first (has pattern rows)
        do {
            let response: APIResponse<InstructionDetailResponse> = try await APIClient.shared.get("/counter/\(sectionId)/instruction")
            applyInstructionDetail(response.data)
            hasInstructions = true
        } catch {
            // Fall back to basic counter state
            hasInstructions = false
            do {
                let response: APIResponse<CounterState> = try await APIClient.shared.get("/counter/\(sectionId)")
                currentRow = response.data.currentRow
                targetRows = response.data.targetRows
            } catch {
                self.error = error.localizedDescription
            }
        }
    }

    func increment() async {
        let previousRow = currentRow
        currentRow += 1  // Optimistic update
        do {
            let response: APIResponse<CounterResponse> = try await APIClient.shared.post("/counter/\(sectionId)/increment")
            applyCounterResponse(response.data)
        } catch {
            currentRow = previousRow  // Revert on failure
            self.error = error.localizedDescription
        }
    }

    func decrement() async {
        guard currentRow > 0 else { return }
        let previousRow = currentRow
        currentRow -= 1  // Optimistic update
        do {
            let response: APIResponse<CounterResponse> = try await APIClient.shared.post("/counter/\(sectionId)/decrement")
            applyCounterResponse(response.data)
        } catch {
            currentRow = previousRow  // Revert on failure
            self.error = error.localizedDescription
        }
    }

    func undo() async {
        do {
            let response: APIResponse<CounterResponse> = try await APIClient.shared.post("/counter/\(sectionId)/undo")
            applyCounterResponse(response.data)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func advanceStep() async {
        do {
            let response: APIResponse<CounterResponse> = try await APIClient.shared.post("/counter/\(sectionId)/advance-step")
            applyCounterResponse(response.data)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func switchSection(_ ref: SectionRef) async {
        await load(sectionId: ref.id)
    }

    // MARK: - Private

    private func applyCounterResponse(_ data: CounterResponse) {
        currentRow = data.currentRow
        if let step = data.currentStep {
            currentStep = step
        }
        if let instruction = data.instruction {
            instructionText = instruction.instruction
            stitchCount = instruction.stitchCount
            rowType = instruction.rowType
            sectionCompleted = instruction.sectionCompleted ?? false
            if let pos = instruction.position {
                stepLabel = pos.stepLabel
                currentStep = pos.stepNumber
            }
            if let prog = instruction.progress {
                sectionProgress = prog
                totalSteps = prog.totalSteps
            }
            if instruction.autoAdvanced == true {
                // Reload full instruction context after auto-advance
                Task {
                    do {
                        let response: APIResponse<InstructionDetailResponse> = try await APIClient.shared.get("/counter/\(sectionId)/instruction")
                        applyInstructionDetail(response.data)
                    } catch {}
                }
            }
        }
    }

    private func applyInstructionDetail(_ data: InstructionDetailResponse) {
        sectionName = data.sectionName
        sectionCompleted = data.sectionCompleted
        instructionText = data.step.instruction
        stitchCount = data.step.stitchCount
        rowType = data.step.rowType
        isOpenEnded = data.step.isOpenEnded ?? false
        currentStep = data.step.stepNumber
        stepLabel = data.position.stepLabel
        sectionProgress = data.progress
        totalSteps = data.progress.totalSteps
        previousInstruction = data.context?.previous?.instruction
        nextInstruction = data.context?.next?.instruction
    }
}
