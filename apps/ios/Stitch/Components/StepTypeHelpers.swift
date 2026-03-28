import SwiftUI

/// Returns a color for a pattern step type (setup, work_rows, repeat, etc.)
func stepTypeColor(_ type: String) -> Color {
    switch type {
    case "setup": return .blue
    case "work_rows": return .primary
    case "repeat": return .purple
    case "work_to_measurement": return .orange
    case "finishing": return .green
    default: return .secondary
    }
}

/// Returns a human-readable label for a pattern step type.
func stepTypeLabel(_ type: String) -> String {
    switch type {
    case "setup": return "Setup"
    case "work_rows": return "Work rows"
    case "repeat": return "Repeat"
    case "work_to_measurement": return "Measure"
    case "finishing": return "Finishing"
    default: return type
    }
}
