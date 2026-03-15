import Foundation

@Observable
final class StartPatternFlowViewModel {
    // MARK: - Flow State

    enum FlowStep: Equatable {
        case setup
        case selectSize
        case applyingSize
        case manualSetup
        case review
        case creatingProject
        case error(String)
    }

    var step: FlowStep = .setup
    var pattern: Pattern?
    var isLoading = false
    var error: String?

    // Size selection
    var selectedSizeName: String?

    // Manual sections
    var manualSections: [ManualSection] = [ManualSection(name: "Main", targetRows: nil)]

    // Result
    var createdProjectId: String?

    // Tier
    var userTier: AppTier { SubscriptionManager.shared.tier }

    // MARK: - Load Pattern

    func load(patternId: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<Pattern> = try await APIClient.shared.get("/patterns/\(patternId)")
            pattern = response.data
            selectedSizeName = response.data.selectedSize
            // Pre-populate manual sections from pattern sections if available
            if let sections = response.data.sections, !sections.isEmpty {
                manualSections = sections.map { ManualSection(name: $0.name, targetRows: nil) }
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Computed State

    var hasPdf: Bool { pattern?.firstPdfUploadId != nil }
    var isAiParsed: Bool { pattern?.aiParsed == true }
    var hasMultipleSizes: Bool { (pattern?.sizes?.count ?? 0) > 1 }
    var hasSingleSize: Bool { (pattern?.sizes?.count ?? 0) == 1 }

    var canParseWithAI: Bool {
        // Plus and Pro can parse; Free gets limited parses
        // The server enforces the actual limit; we just show the option
        hasPdf && !isAiParsed
    }

    // MARK: - Setup Actions

    func handleSetupContinue() {
        if isAiParsed && hasMultipleSizes {
            step = .selectSize
        } else if isAiParsed && hasSingleSize {
            selectedSizeName = pattern?.sizes?.first?.name
            step = .review
        } else if isAiParsed {
            step = .review
        } else {
            step = .manualSetup
        }
    }

    func parseWithAI(uploadId: String) async {
        guard let patternId = pattern?.id else { return }
        step = .applyingSize

        struct Body: Encodable { let pdf_upload_id: String }
        do {
            let response: APIResponse<ParseResponse> = try await APIClient.shared.post(
                "/pdf/parse",
                body: Body(pdf_upload_id: uploadId)
            )
            pattern = response.data.pattern

            if hasMultipleSizes {
                step = .selectSize
            } else if hasSingleSize {
                if let sizeName = pattern?.sizes?.first?.name {
                    await applySize(sizeName)
                } else {
                    step = .review
                }
            } else {
                step = .review
            }
        } catch let error as APIError {
            step = .error(apiErrorMessage(error))
        } catch {
            step = .error(error.localizedDescription)
        }
    }

    // MARK: - Size Selection

    func applySize(_ sizeName: String) async {
        guard let patternId = pattern?.id else { return }
        selectedSizeName = sizeName
        step = .applyingSize

        struct Body: Encodable { let size_name: String }
        do {
            let response: APIResponse<Pattern> = try await APIClient.shared.post(
                "/patterns/\(patternId)/apply-size",
                body: Body(size_name: sizeName)
            )
            pattern = response.data
            step = .review
        } catch let error as APIError {
            step = .error(apiErrorMessage(error))
        } catch {
            step = .error(error.localizedDescription)
        }
    }

    // MARK: - Manual Setup

    func addSection() {
        manualSections.append(ManualSection(name: "", targetRows: nil))
    }

    func removeSection(at offsets: IndexSet) {
        manualSections.remove(atOffsets: offsets)
        if manualSections.isEmpty {
            manualSections.append(ManualSection(name: "Main", targetRows: nil))
        }
    }

    func continueFromManualSetup() {
        // Filter out empty-named sections
        manualSections = manualSections.filter { !$0.name.trimmingCharacters(in: .whitespaces).isEmpty }
        if manualSections.isEmpty {
            manualSections.append(ManualSection(name: "Main", targetRows: nil))
        }
        step = .review
    }

    // MARK: - Create Project

    func createProject() async {
        guard let patternId = pattern?.id else { return }
        step = .creatingProject

        do {
            let body = CreateFromPatternBody(
                pattern_id: patternId,
                size_name: isAiParsed ? selectedSizeName : nil,
                manual_sections: isAiParsed ? nil : manualSections.map {
                    CreateFromPatternBody.ManualSectionBody(
                        name: $0.name,
                        target_rows: $0.targetRows
                    )
                }
            )
            let response: APIResponse<Project> = try await APIClient.shared.post(
                "/projects/create-from-pattern",
                body: body
            )
            createdProjectId = response.data.id
        } catch let error as APIError {
            step = .error(apiErrorMessage(error))
        } catch {
            step = .error(error.localizedDescription)
        }
    }

    // MARK: - Sections for Review

    var reviewSections: [(name: String, rowCount: String)] {
        if isAiParsed {
            return pattern?.sections?.map { section in
                let count = section.rows?.count ?? 0
                return (name: section.name, rowCount: count > 0 ? "\(count) steps" : "No steps")
            } ?? []
        } else {
            return manualSections.map { section in
                let rows = section.targetRows.map { "\($0) rows" } ?? "Open-ended"
                return (name: section.name, rowCount: rows)
            }
        }
    }

    // MARK: - Helpers

    private func apiErrorMessage(_ error: APIError) -> String {
        switch error {
        case .httpError(let code, let body):
            if let json = try? JSONSerialization.jsonObject(with: body) as? [String: Any],
               let message = json["message"] as? String ?? json["error"] as? String {
                return message
            }
            if code == 403 {
                return "This feature requires an upgrade"
            }
            return "Request failed (\(code))"
        default:
            return error.localizedDescription
        }
    }
}

// MARK: - Request Body

private struct CreateFromPatternBody: Encodable {
    let pattern_id: String
    let size_name: String?
    let manual_sections: [ManualSectionBody]?

    struct ManualSectionBody: Encodable {
        let name: String
        let target_rows: Int?
    }
}
