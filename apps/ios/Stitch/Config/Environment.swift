import Foundation

enum AppConfig {
    // MARK: - API Base URLs

    /// Base URL for the Next.js API (web app)
    static var apiBaseURL: String {
        #if DEBUG
        return "http://192.168.2.46:3000/api/v1"
        #else
        return "https://your-production-domain.com/api/v1"
        #endif
    }

    // MARK: - Supabase (for Realtime)

    static var supabaseURL: String {
        #if DEBUG
        return "http://127.0.0.1:54321"
        #else
        return "https://your-project-ref.supabase.co"
        #endif
    }

    static var supabaseAnonKey: String {
        #if DEBUG
        return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
        #else
        return "your-production-anon-key"
        #endif
    }

    // MARK: - Clerk

    static let clerkPublishableKey = "pk_test_bWludC1jYWltYW4tNDUuY2xlcmsuYWNjb3VudHMuZGV2JA"

    // MARK: - RevenueCat

    static let revenueCatAPIKey = "test_wtNabmgUgQDoADuIhIGYnEuaFmp"
}
