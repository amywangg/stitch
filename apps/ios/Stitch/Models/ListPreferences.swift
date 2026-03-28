import Foundation

// MARK: - Grid Layout

/// Shared layout mode for list/grid/large views across features.
/// Used by projects, patterns, stash, and needles screens.
enum GridLayout: String, CaseIterable {
    case grid
    case list
    case large

    var icon: String {
        switch self {
        case .grid: return "square.grid.2x2"
        case .list: return "list.bullet"
        case .large: return "rectangle.grid.1x2"
        }
    }

    var label: String {
        switch self {
        case .grid: return "Grid"
        case .list: return "List"
        case .large: return "Large"
        }
    }

    /// Next mode in rotation (for toggle buttons).
    var next: GridLayout {
        switch self {
        case .list: return .grid
        case .grid: return .large
        case .large: return .list
        }
    }
}

// MARK: - Sortable

/// Protocol for sort option enums that provide a label and icon.
/// Concrete sort enums define their own cases and sorting logic,
/// but share the display pattern.
///
/// Usage:
/// ```swift
/// enum ProjectsSort: String, CaseIterable, Sortable {
///     case newest, oldest, alphabetical, recentlyUpdated
///     var label: String { ... }
///     var icon: String { ... }
/// }
/// ```
protocol Sortable: RawRepresentable, CaseIterable, Hashable where RawValue == String {
    var label: String { get }
    var icon: String { get }
}
