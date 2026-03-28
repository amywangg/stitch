import SwiftUI

// MARK: - Error Alert Modifier

/// A reusable ViewModifier that presents an alert when an optional error string is non-nil.
/// Automatically dismisses and clears the error binding when the user taps "OK".
struct ErrorAlertModifier: ViewModifier {
    @Binding var error: String?

    func body(content: Content) -> some View {
        content
            .alert("Error", isPresented: .init(
                get: { error != nil },
                set: { if !$0 { error = nil } }
            )) {
                Button("OK") { error = nil }
            } message: {
                Text(error ?? "")
            }
    }
}

// MARK: - View Extension

extension View {
    /// Presents an error alert when the bound error string is non-nil.
    ///
    /// Usage:
    /// ```swift
    /// .errorAlert(error: $viewModel.error)
    /// ```
    func errorAlert(error: Binding<String?>) -> some View {
        modifier(ErrorAlertModifier(error: error))
    }
}
