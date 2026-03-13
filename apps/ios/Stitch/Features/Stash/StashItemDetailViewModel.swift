import Foundation
import SwiftUI

@Observable
final class StashItemDetailViewModel {
    var item: StashItem?
    var isLoading = false
    var isSaving = false
    var isDeleting = false
    var isUploadingPhoto = false
    var isIdentifyingColorway = false
    var colorwaySuggestion: ColorwayIdentification?
    var error: String?
    var showUpgradePrompt = false
    var didDelete = false

    // Editable fields
    var colorway: String = ""
    var skeins: Double = 1
    var status: String = "in_stash"
    var notes: String = ""

    // MARK: - Computed

    var hasChanges: Bool {
        guard let item else { return false }
        return colorway != (item.colorway ?? "")
            || skeins != item.skeins
            || status != (item.status ?? "in_stash")
            || notes != (item.notes ?? "")
    }

    var statusOptions: [(value: String, label: String)] {
        [
            ("in_stash", "In stash"),
            ("used_up", "Used up"),
            ("gifted", "Gifted"),
            ("for_sale", "For sale"),
        ]
    }

    // MARK: - Load

    func load(id: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<StashItem> = try await APIClient.shared.get("/stash/\(id)")
            item = response.data
            syncEditableFields()
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Save

    func save() async {
        guard let item, hasChanges else { return }
        isSaving = true
        defer { isSaving = false }
        do {
            let body = StashUpdateBody(
                colorway: colorway.isEmpty ? nil : colorway,
                skeins: skeins,
                status: status,
                notes: notes.isEmpty ? nil : notes
            )
            let response: APIResponse<StashItem> = try await APIClient.shared.patch(
                "/stash/\(item.id)", body: body
            )
            self.item = response.data
            syncEditableFields()
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Photo Upload

    func uploadPhoto(imageData: Data) async {
        guard let item else { return }
        isUploadingPhoto = true
        defer { isUploadingPhoto = false }
        do {
            let response: APIResponse<StashItem> = try await APIClient.shared.upload(
                "/stash/\(item.id)/photo",
                imageData: imageData,
                mimeType: "image/jpeg",
                fileName: "yarn.jpg"
            )
            self.item = response.data
            syncEditableFields()
        } catch let apiError as APIError {
            switch apiError.errorCode {
            case "FREE_LIMIT_REACHED":
                self.showUpgradePrompt = true
                self.error = apiError.localizedDescription
            case "CONTENT_REJECTED":
                self.error = "This image couldn't be uploaded. Please use a photo of yarn or craft supplies."
            default:
                self.error = apiError.localizedDescription
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - AI Colorway Identification (Pro)

    func identifyColorway() async {
        guard let item, item.photoUrl != nil else { return }
        isIdentifyingColorway = true
        colorwaySuggestion = nil
        defer { isIdentifyingColorway = false }
        do {
            let response: APIResponse<ColorwayIdentification> = try await APIClient.shared.post(
                "/stash/\(item.id)/identify-colorway"
            )
            colorwaySuggestion = response.data
        } catch let apiError as APIError {
            if apiError.errorCode == "Pro required" {
                self.showUpgradePrompt = true
                self.error = "Upgrade to Pro to use AI colorway identification."
            } else {
                self.error = apiError.localizedDescription
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func acceptColorwaySuggestion() {
        guard let suggestion = colorwaySuggestion else { return }
        colorway = suggestion.colorway
        colorwaySuggestion = nil
    }

    // MARK: - Delete

    func delete() async {
        guard let item else { return }
        // Optimistic: dismiss immediately
        didDelete = true

        do {
            struct Empty: Decodable {}
            let _: APIResponse<Empty> = try await APIClient.shared.delete("/stash/\(item.id)")
        } catch {
            // Revert if it fails (user will see the item again)
            didDelete = false
            self.error = error.localizedDescription
        }
    }

    // MARK: - Private

    private func syncEditableFields() {
        guard let item else { return }
        colorway = item.colorway ?? ""
        skeins = item.skeins
        status = item.status ?? "in_stash"
        notes = item.notes ?? ""
    }
}

// MARK: - Request Body

private struct StashUpdateBody: Encodable {
    let colorway: String?
    let skeins: Double
    let status: String
    let notes: String?
}
