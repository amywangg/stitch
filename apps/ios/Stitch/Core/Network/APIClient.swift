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
        let token = await ClerkManager.shared.sessionToken()
        if let token {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            print("[API] \(method) \(path) (token: \(token.prefix(20))...)")
        } else {
            print("[API] \(method) \(path) (NO TOKEN)")
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

        print("[API] \(method) \(path) → \(http.statusCode)")

        if http.statusCode == 401 {
            let body = String(data: data.prefix(300), encoding: .utf8) ?? ""
            print("[API] 401 UNAUTHORIZED: \(body)")
            throw APIError.unauthorized
        }

        guard (200..<300).contains(http.statusCode) else {
            let body = String(data: data.prefix(500), encoding: .utf8) ?? ""
            print("[API] ERROR \(http.statusCode): \(body)")
            throw APIError.httpError(statusCode: http.statusCode, body: data)
        }

        do {
            return try JSONDecoder.iso8601.decode(T.self, from: data)
        } catch {
            let body = String(data: data.prefix(500), encoding: .utf8) ?? ""
            print("[API] DECODE ERROR on \(path): \(error)\nBody: \(body)")
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

    // MARK: - Raw Data Request (e.g., PDF download)

    func rawPost(_ path: String, body: [String: Any]) async throws -> Data {
        guard let url = URL(string: AppConfig.apiBaseURL + path) else {
            throw APIError.invalidURL
        }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = await ClerkManager.shared.sessionToken() {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: req)

        guard let http = response as? HTTPURLResponse else {
            throw APIError.networkError(URLError(.badServerResponse))
        }

        if http.statusCode == 401 { throw APIError.unauthorized }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.httpError(statusCode: http.statusCode, body: data)
        }

        return data
    }

    // MARK: - Dictionary Body Request (for dynamic key/value bodies)

    func patch(_ path: String, body: [String: Any]) async throws -> Data {
        guard let url = URL(string: AppConfig.apiBaseURL + path) else {
            throw APIError.invalidURL
        }

        var req = URLRequest(url: url)
        req.httpMethod = "PATCH"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = await ClerkManager.shared.sessionToken() {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: req)

        guard let http = response as? HTTPURLResponse else {
            throw APIError.networkError(URLError(.badServerResponse))
        }

        if http.statusCode == 401 { throw APIError.unauthorized }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.httpError(statusCode: http.statusCode, body: data)
        }

        return data
    }

    func post(_ path: String, body: [String: Any]) async throws -> Data {
        guard let url = URL(string: AppConfig.apiBaseURL + path) else {
            throw APIError.invalidURL
        }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = await ClerkManager.shared.sessionToken() {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: req)

        guard let http = response as? HTTPURLResponse else {
            throw APIError.networkError(URLError(.badServerResponse))
        }

        if http.statusCode == 401 { throw APIError.unauthorized }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.httpError(statusCode: http.statusCode, body: data)
        }

        return data
    }

    // MARK: - Multipart Upload

    func upload<T: Decodable>(
        _ path: String,
        imageData: Data,
        mimeType: String = "image/jpeg",
        fileName: String = "avatar.jpg",
        method: String = "POST",
        fields: [String: String] = [:]
    ) async throws -> T {
        guard let url = URL(string: AppConfig.apiBaseURL + path) else {
            throw APIError.invalidURL
        }

        let boundary = UUID().uuidString
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        if let token = await ClerkManager.shared.sessionToken() {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        var body = Data()

        // Additional form fields
        for (key, value) in fields {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(key)\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(value)\r\n".data(using: .utf8)!)
        }

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
        // Prisma returns ISO 8601 dates with fractional seconds (e.g. "2024-03-16T12:00:00.000Z").
        // The built-in .iso8601 strategy does NOT handle fractional seconds, so we use a custom
        // strategy that tries both formats.
        let formatterWithFraction = ISO8601DateFormatter()
        formatterWithFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let formatterWithout = ISO8601DateFormatter()
        formatterWithout.formatOptions = [.withInternetDateTime]

        d.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let string = try container.decode(String.self)
            if let date = formatterWithFraction.date(from: string) {
                return date
            }
            if let date = formatterWithout.date(from: string) {
                return date
            }
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Cannot decode date: \(string)"
            )
        }
        return d
    }()
}
