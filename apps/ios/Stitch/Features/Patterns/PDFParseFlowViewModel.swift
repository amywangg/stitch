import Foundation
import SwiftUI

@Observable
final class PDFParseFlowViewModel {
    // MARK: - Flow State

    enum FlowStep: Equatable {
        case pickPdf
        case parsing
        case ravelryMatch
        case selectSize
        case applyingSize
        case ready
        case creatingProject
        case error(String)
    }

    var step: FlowStep = .pickPdf
    var pattern: Pattern?
    var ravelryMatches: [RavelryMatchCandidate] = []
    var isLinkingRavelry = false
    var progressMessage = "Uploading PDF..."
    var createdProjectId: String?

    // MARK: - Parse PDF

    func parsePdf(data: Data, fileName: String) async {
        step = .parsing
        progressMessage = "Uploading PDF..."

        do {
            // Small delay to show upload state
            try await Task.sleep(for: .milliseconds(300))
            progressMessage = "Analyzing pattern..."

            let response: APIResponse<ParseResponse> = try await APIClient.shared.upload(
                "/pdf/parse",
                imageData: data,
                mimeType: "application/pdf",
                fileName: fileName
            )

            pattern = response.data.pattern
            ravelryMatches = response.data.ravelryMatches ?? []

            if !ravelryMatches.isEmpty {
                step = .ravelryMatch
            } else if hasSingleSize {
                // Auto-apply for single-size patterns
                if let sizeName = pattern?.sizes?.first?.name {
                    await applySize(sizeName)
                } else {
                    step = .ready
                }
            } else if pattern?.sizes?.isEmpty == false {
                step = .selectSize
            } else {
                step = .ready
            }
        } catch let error as APIError {
            step = .error(apiErrorMessage(error))
        } catch {
            step = .error(error.localizedDescription)
        }
    }

    func parsePdf(uploadId: String) async {
        step = .parsing
        progressMessage = "Analyzing pattern..."

        struct Body: Encodable { let pdf_upload_id: String }
        do {
            let response: APIResponse<ParseResponse> = try await APIClient.shared.post(
                "/pdf/parse",
                body: Body(pdf_upload_id: uploadId)
            )

            pattern = response.data.pattern
            ravelryMatches = response.data.ravelryMatches ?? []

            if !ravelryMatches.isEmpty {
                step = .ravelryMatch
            } else if hasSingleSize {
                if let sizeName = pattern?.sizes?.first?.name {
                    await applySize(sizeName)
                } else {
                    step = .ready
                }
            } else if pattern?.sizes?.isEmpty == false {
                step = .selectSize
            } else {
                step = .ready
            }
        } catch let error as APIError {
            step = .error(apiErrorMessage(error))
        } catch {
            step = .error(error.localizedDescription)
        }
    }

    // MARK: - Ravelry Linking

    func linkRavelry(_ match: RavelryMatchCandidate) async {
        guard let patternId = pattern?.id else { return }
        isLinkingRavelry = true
        defer { isLinkingRavelry = false }

        struct Body: Encodable { let ravelry_id: Int }
        do {
            let response: APIResponse<Pattern> = try await APIClient.shared.post(
                "/patterns/\(patternId)/link-ravelry",
                body: Body(ravelry_id: match.ravelryId)
            )
            pattern = response.data
        } catch {
            // Non-critical — continue without linking
        }

        advanceToSizeStep()
    }

    func skipRavelryLink() {
        advanceToSizeStep()
    }

    // MARK: - Size Selection

    func applySize(_ sizeName: String) async {
        guard let patternId = pattern?.id else { return }
        step = .applyingSize

        struct Body: Encodable { let size_name: String }
        do {
            let response: APIResponse<Pattern> = try await APIClient.shared.post(
                "/patterns/\(patternId)/apply-size",
                body: Body(size_name: sizeName)
            )
            pattern = response.data
            step = .ready
        } catch let error as APIError {
            step = .error(apiErrorMessage(error))
        } catch {
            step = .error(error.localizedDescription)
        }
    }

    func skipSizeSelection() {
        step = .ready
    }

    // MARK: - Create Project

    func createProject() async {
        guard let patternId = pattern?.id else { return }
        step = .creatingProject

        struct Body: Encodable { let pattern_id: String }
        do {
            let response: APIResponse<Project> = try await APIClient.shared.post(
                "/projects/create-from-pattern",
                body: Body(pattern_id: patternId)
            )
            createdProjectId = response.data.id
        } catch let error as APIError {
            step = .error(apiErrorMessage(error))
        } catch {
            step = .error(error.localizedDescription)
        }
    }

    // MARK: - Helpers

    var hasSingleSize: Bool {
        guard let sizes = pattern?.sizes else { return false }
        return sizes.count == 1
    }

    var hasMultipleSizes: Bool {
        guard let sizes = pattern?.sizes else { return false }
        return sizes.count > 1
    }

    private func advanceToSizeStep() {
        if hasSingleSize {
            Task {
                if let sizeName = pattern?.sizes?.first?.name {
                    await applySize(sizeName)
                } else {
                    step = .ready
                }
            }
        } else if hasMultipleSizes {
            step = .selectSize
        } else {
            step = .ready
        }
    }

    private func apiErrorMessage(_ error: APIError) -> String {
        switch error {
        case .httpError(let code, let body):
            if code == 403 {
                if let json = try? JSONSerialization.jsonObject(with: body) as? [String: Any],
                   let message = json["message"] as? String {
                    return message
                }
                return "This feature requires Pro"
            }
            if let json = try? JSONSerialization.jsonObject(with: body) as? [String: Any],
               let message = json["error"] as? String {
                return message
            }
            return "Request failed (\(code))"
        default:
            return error.localizedDescription
        }
    }
}
