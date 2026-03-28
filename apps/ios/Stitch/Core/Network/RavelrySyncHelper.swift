import Foundation

// MARK: - Ravelry Sync Helper

/// Shared helper for syncing data from Ravelry.
/// Eliminates duplicated sync logic across StashViewModel and NeedlesViewModel.
struct RavelrySyncHelper {

    // MARK: - Sync Result

    /// Decoded response from Ravelry sync endpoints.
    struct SyncResult: Decodable {
        let imported: Int
        let updated: Int
        let skipped: Int?
        let errors: [String]?
    }

    // MARK: - Sync

    /// Performs a Ravelry sync by POSTing to the given endpoint and returns a user-facing message.
    ///
    /// - Parameters:
    ///   - endpoint: The API path to POST to (e.g. "/integrations/ravelry/sync/stash").
    ///   - entityName: A human-readable name for the data being synced (e.g. "Stash", "Needles").
    /// - Returns: A user-facing summary message string.
    /// - Throws: Any error from the API call.
    ///
    /// Usage:
    /// ```swift
    /// let message = try await RavelrySyncHelper.sync(
    ///     endpoint: "/integrations/ravelry/sync/stash",
    ///     entityName: "Stash"
    /// )
    /// syncMessage = message
    /// ```
    static func sync(endpoint: String, entityName: String) async throws -> String {
        let response: APIResponse<SyncResult> = try await APIClient.shared.post(endpoint)
        let result = response.data

        if let errors = result.errors, !errors.isEmpty {
            return "Synced with \(errors.count) error(s): \(errors.first ?? "")"
        } else if result.imported == 0 && result.updated == 0 {
            return "\(entityName) is up to date"
        } else {
            var parts: [String] = []
            if result.imported > 0 { parts.append("\(result.imported) imported") }
            if result.updated > 0 { parts.append("\(result.updated) updated") }
            return parts.joined(separator: ", ")
        }
    }
}
