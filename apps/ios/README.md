# Stitch iOS

SwiftUI iOS app (iOS 17+). Primary frontend for the Stitch knitting app.

## Setup

1. Open `Stitch.xcodeproj` (or `.xcworkspace` after adding SPM packages) in Xcode.
2. Add Swift Package dependencies via **File → Add Package Dependencies**:
   - Clerk iOS: `https://github.com/clerk/clerk-ios`
   - RevenueCat: `https://github.com/RevenueCat/purchases-ios`
   - Supabase Swift: `https://github.com/supabase/supabase-swift`
3. Configure `Config/Environment.swift` with your API base URL and Supabase credentials.
4. Replace stub implementations in:
   - `Core/Auth/ClerkManager.swift` — use real Clerk iOS SDK calls
   - `Core/Subscriptions/SubscriptionManager.swift` — use real RevenueCat SDK calls
   - `Core/Realtime/RealtimeManager.swift` — use real Supabase Realtime SDK calls
5. Run on simulator or device.
