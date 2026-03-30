import Foundation

enum AppConfig {
    // MARK: - API Base URLs

    /// Base URL for the Next.js API (web app)
    /// For alpha: both debug and release point to staging
    static var apiBaseURL: String {
        return "https://staging.stitch-marker.com/api/v1"
    }

    // MARK: - Supabase (for Realtime)

    static var supabaseURL: String {
        return "https://zyluwnvhpddzqafwvkzf.supabase.co"
    }

    static var supabaseAnonKey: String {
        return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bHV3bnZocGRkenFhZnd2a3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MzgyNzMsImV4cCI6MjA4OTAxNDI3M30.bTH8cL4-AkjrWox_prv0fiMFnd7Tn9ruvWB-cbvnPOY"
    }

    // MARK: - Clerk

    static let clerkPublishableKey = "pk_test_bWludC1jYWltYW4tNDUuY2xlcmsuYWNjb3VudHMuZGV2JA"

    // MARK: - RevenueCat

    static let revenueCatAPIKey = "test_wtNabmgUgQDoADuIhIGYnEuaFmp"
}
