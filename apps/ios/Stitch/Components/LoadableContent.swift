import SwiftUI

// MARK: - LoadableContent

/// A generic container that switches between loading, empty, and content states.
///
/// - Shows `ProgressView` when `isLoading` is true AND the content collection is empty.
/// - Shows the `empty` view when not loading AND the content collection is empty.
/// - Shows the `content` view otherwise (data is available).
///
/// Usage:
/// ```swift
/// LoadableContent(isLoading: viewModel.isLoading, isEmpty: viewModel.items.isEmpty) {
///     List(viewModel.items) { item in ... }
/// } empty: {
///     ContentUnavailableView("No items", systemImage: "tray")
/// }
/// ```
struct LoadableContent<Content: View, EmptyContent: View>: View {
    let isLoading: Bool
    let isEmpty: Bool
    @ViewBuilder let content: () -> Content
    @ViewBuilder let empty: () -> EmptyContent

    var body: some View {
        if isLoading && isEmpty {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if isEmpty {
            empty()
        } else {
            content()
        }
    }
}
