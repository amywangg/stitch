import Foundation

enum APIError: Error, LocalizedError {
    case invalidURL
    case unauthorized
    case httpError(statusCode: Int, body: Data)
    case decodingError(Error)
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .unauthorized: return "Please sign in again."
        case .httpError(let statusCode, let body):
            // Try to extract a user-friendly message from the JSON response
            if let parsed = try? JSONDecoder().decode(APIErrorBody.self, from: body),
               let message = parsed.message {
                return message
            }
            if let bodyStr = String(data: body.prefix(200), encoding: .utf8) {
                return "Request failed (\(statusCode)): \(bodyStr)"
            }
            return "Something went wrong (HTTP \(statusCode)). Please try again."
        case .decodingError(let e): return "Failed to decode: \(e.localizedDescription)"
        case .networkError(let e): return e.localizedDescription
        default: return "An unexpected error occurred."
        }
    }

    /// Machine-readable error code from the API (e.g. "FREE_LIMIT_REACHED", "CONTENT_REJECTED", "PRO_REQUIRED")
    var errorCode: String? {
        guard case .httpError(_, let body) = self,
              let parsed = try? JSONDecoder().decode(APIErrorBody.self, from: body) else {
            return nil
        }
        return parsed.error
    }

    /// Upgrade URL returned by pro-gated or limit-gated endpoints
    var upgradeURL: String? {
        guard case .httpError(_, let body) = self,
              let parsed = try? JSONDecoder().decode(APIErrorBody.self, from: body) else {
            return nil
        }
        return parsed.upgradeUrl
    }
}

/// Represents the standard error JSON returned by API routes
private struct APIErrorBody: Decodable {
    let error: String?
    let message: String?
    let upgradeUrl: String?

    enum CodingKeys: String, CodingKey {
        case error, message
        case upgradeUrl = "upgrade_url"
    }
}

/// URLSession-based API client. Automatically attaches the Clerk JWT.
final class APIClient {
    static let shared = APIClient()
    private init() {}

    private let session = URLSession.shared

    // MARK: - Generic Request

    func request<T: Decodable>(
        _ method: String,
        path: String,
        body: (any Encodable)? = nil
    ) async throws -> T {
        guard let url = URL(string: AppConfig.apiBaseURL + path) else {
            throw APIError.invalidURL
        }

        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Attach Clerk JWT
        if let token = await ClerkManager.shared.sessionToken() {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            req.httpBody = try JSONEncoder().encode(body)
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: req)
        } catch let urlError as URLError where urlError.code == .cancelled {
            throw CancellationError()
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.networkError(URLError(.badServerResponse))
        }

        if http.statusCode == 401 {
            throw APIError.unauthorized
        }

        guard (200..<300).contains(http.statusCode) else {
            throw APIError.httpError(statusCode: http.statusCode, body: data)
        }

        do {
            return try JSONDecoder.iso8601.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    // MARK: - Convenience Methods

    func get<T: Decodable>(_ path: String) async throws -> T {
        try await request("GET", path: path)
    }

    func post<T: Decodable>(_ path: String, body: (any Encodable)? = nil) async throws -> T {
        try await request("POST", path: path, body: body)
    }

    func put<T: Decodable>(_ path: String, body: (any Encodable)? = nil) async throws -> T {
        try await request("PUT", path: path, body: body)
    }

    func patch<T: Decodable>(_ path: String, body: (any Encodable)? = nil) async throws -> T {
        try await request("PATCH", path: path, body: body)
    }

    func delete<T: Decodable>(_ path: String, body: (any Encodable)? = nil) async throws -> T {
        try await request("DELETE", path: path, body: body)
    }

    // MARK: - Multipart Upload

    func upload<T: Decodable>(
        _ path: String,
        imageData: Data,
        mimeType: String = "image/jpeg",
        fileName: String = "avatar.jpg"
    ) async throws -> T {
        guard let url = URL(string: AppConfig.apiBaseURL + path) else {
            throw APIError.invalidURL
        }

        let boundary = UUID().uuidString
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        if let token = await ClerkManager.shared.sessionToken() {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        req.httpBody = body

        let (data, response) = try await session.data(for: req)

        guard let http = response as? HTTPURLResponse else {
            throw APIError.networkError(URLError(.badServerResponse))
        }

        if http.statusCode == 401 { throw APIError.unauthorized }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.httpError(statusCode: http.statusCode, body: data)
        }

        do {
            return try JSONDecoder.iso8601.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }
}

// MARK: - JSONDecoder helper

extension JSONDecoder {
    static let iso8601: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        d.dateDecodingStrategy = .iso8601
        return d
    }()
}
