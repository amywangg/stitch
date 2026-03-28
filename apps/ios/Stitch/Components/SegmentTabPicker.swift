import SwiftUI

// MARK: - SegmentTab Protocol

/// Protocol for tab types used with `SegmentTabPicker`.
/// Requires a display label for each tab case.
protocol SegmentTab {
    var label: String { get }
}

// MARK: - SegmentTabPicker

/// A reusable underline-style tab picker for switching between cases of a `CaseIterable` enum.
/// Renders each case as a tappable label with an animated underline indicator.
///
/// Usage:
/// ```swift
/// SegmentTabPicker(selection: $selectedTab)
/// ```
///
/// Where the tab enum conforms to `SegmentTab`:
/// ```swift
/// enum FeedTab: String, CaseIterable, SegmentTab {
///     case social, activity
///     var label: String { ... }
/// }
/// ```
struct SegmentTabPicker<T: Hashable & CaseIterable & SegmentTab>: View where T.AllCases: RandomAccessCollection {
    @Binding var selection: T

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(T.allCases), id: \.self) { tab in
                tabButton(for: tab)
            }
        }
        .padding(.horizontal, 16)
        .background(.background)
    }

    // MARK: - Tab Button

    private func tabButton(for tab: T) -> some View {
        let isSelected = selection == tab
        return Button {
            withAnimation(.easeInOut(duration: 0.2)) { selection = tab }
        } label: {
            VStack(spacing: 6) {
                Text(tab.label)
                    .font(.subheadline.weight(isSelected ? .semibold : .regular))
                    .foregroundStyle(isSelected ? .primary : .secondary)
                Rectangle()
                    .fill(isSelected ? Color(hex: "#FF6B6B") : .clear)
                    .frame(height: 2)
            }
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
    }
}
