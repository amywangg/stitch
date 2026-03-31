import Foundation

enum AppConfig {
    // MARK: - API Base URLs
    // Switch environment via Xcode scheme:
    //   "Stitch" scheme → local dev (default for debug)
    //   "Stitch Staging" scheme → staging server
    //   Release builds → staging (for TestFlight)

    static var apiBaseURL: String {
        #if STAGING
        return "https://staging.stitch-marker.com/api/v1"
        #elseif DEBUG
        return "http://192.168.2.46:3000/api/v1"
        #else
        return "https://staging.stitch-marker.com/api/v1"
        #endif
    }

    // MARK: - Supabase

    static var supabaseURL: String {
        #if STAGING
        return "https://zyluwnvhpddzqafwvkzf.supabase.co"
        #elseif DEBUG
        return "http://127.0.0.1:54321"
        #else
        return "https://zyluwnvhpddzqafwvkzf.supabase.co"
        #endif
    }

    static var supabaseAnonKey: String {
        #if STAGING
        return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bHV3bnZocGRkenFhZnd2a3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MzgyNzMsImV4cCI6MjA4OTAxNDI3M30.bTH8cL4-AkjrWox_prv0fiMFnd7Tn9ruvWB-cbvnPOY"
        #elseif DEBUG
        return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
        #else
        return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bHV3bnZocGRkenFhZnd2a3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MzgyNzMsImV4cCI6MjA4OTAxNDI3M30.bTH8cL4-AkjrWox_prv0fiMFnd7Tn9ruvWB-cbvnPOY"
        #endif
    }

    // MARK: - Clerk

    static var clerkPublishableKey: String {
        #if STAGING
        return "pk_live_Y2xlcmsuc3RhZ2luZy5zdGl0Y2gtbWFya2VyLmNvbSQ"
        #elseif DEBUG
        return "pk_test_bWludC1jYWltYW4tNDUuY2xlcmsuYWNjb3VudHMuZGV2JA"
        #else
        return "pk_live_Y2xlcmsuc3RhZ2luZy5zdGl0Y2gtbWFya2VyLmNvbSQ"
        #endif
    }

    // MARK: - RevenueCat

    static let revenueCatAPIKey = "test_wtNabmgUgQDoADuIhIGYnEuaFmp"

    // MARK: - Environment Label (for debug display)

    static var environmentName: String {
        #if STAGING
        return "STAGING"
        #elseif DEBUG
        return "LOCAL"
        #else
        return "RELEASE"
        #endif
    }
}
