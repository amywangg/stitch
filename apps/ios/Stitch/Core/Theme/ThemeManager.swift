import SwiftUI

// MARK: - Theme Colors

enum PrimaryColor: String, CaseIterable, Identifiable {
    case coral = "#FF6B6B"
    case teal = "#4ECDC4"
    case indigo = "#6366F1"
    case rose = "#F43F5E"
    case amber = "#F59E0B"
    case violet = "#8B5CF6"

    var id: String { rawValue }

    var color: Color { Color(hex: rawValue) }

    var name: String {
        switch self {
        case .coral: return "Coral"
        case .teal: return "Teal"
        case .indigo: return "Indigo"
        case .rose: return "Rose"
        case .amber: return "Amber"
        case .violet: return "Violet"
        }
    }
}

enum BackgroundStyle: String, CaseIterable, Identifiable {
    // Light backgrounds
    case white = "white"
    case cream = "cream"
    case softGray = "soft_gray"
    // Dark backgrounds
    case darkGray = "dark_gray"
    case charcoal = "charcoal"
    case midnight = "midnight"

    var id: String { rawValue }

    var isDark: Bool {
        switch self {
        case .white, .cream, .softGray: return false
        case .darkGray, .charcoal, .midnight: return true
        }
    }

    var color: Color {
        switch self {
        case .white: return Color(.systemBackground)
        case .cream: return Color(hex: "#FDF6EC")
        case .softGray: return Color(hex: "#F2F2F7")
        case .darkGray: return Color(hex: "#1C1C1E")
        case .charcoal: return Color(hex: "#141414")
        case .midnight: return Color(hex: "#0A0A12")
        }
    }

    var name: String {
        switch self {
        case .white: return "White"
        case .cream: return "Cream"
        case .softGray: return "Soft gray"
        case .darkGray: return "Dark gray"
        case .charcoal: return "Charcoal"
        case .midnight: return "Midnight"
        }
    }

    static var lightOptions: [BackgroundStyle] { [.white, .cream, .softGray] }
    static var darkOptions: [BackgroundStyle] { [.darkGray, .charcoal, .midnight] }
}

// MARK: - Presets

struct ThemePreset: Identifiable {
    let id: String
    let name: String
    let primary: PrimaryColor
    let background: BackgroundStyle

    static let classicLight = ThemePreset(id: "classic_light", name: "Classic", primary: .coral, background: .white)
    static let warmLight = ThemePreset(id: "warm_light", name: "Warm", primary: .coral, background: .cream)
    static let classicDark = ThemePreset(id: "classic_dark", name: "Dark", primary: .coral, background: .darkGray)
    static let midnightDark = ThemePreset(id: "midnight_dark", name: "Midnight", primary: .teal, background: .midnight)

    static let all: [ThemePreset] = [classicLight, warmLight, classicDark, midnightDark]
}

// MARK: - Theme Manager

@Observable
final class ThemeManager {
    static let shared = ThemeManager()

    var primaryColor: PrimaryColor {
        didSet { UserDefaults.standard.set(primaryColor.rawValue, forKey: "stitch_primary_color") }
    }

    var backgroundStyle: BackgroundStyle {
        didSet { UserDefaults.standard.set(backgroundStyle.rawValue, forKey: "stitch_background_style") }
    }

    // Computed colors for use in views
    var primary: Color { primaryColor.color }
    var background: Color { backgroundStyle.color }
    var isDark: Bool { backgroundStyle.isDark }

    var colorScheme: ColorScheme? {
        backgroundStyle.isDark ? .dark : .light
    }

    /// Surface color for cards/elevated areas
    var surface: Color {
        isDark ? Color.white.opacity(0.08) : Color.black.opacity(0.04)
    }

    /// Primary text color
    var textPrimary: Color {
        isDark ? .white : Color(hex: "#1A1A1A")
    }

    /// Secondary text color
    var textSecondary: Color {
        isDark ? Color.white.opacity(0.6) : Color.black.opacity(0.5)
    }

    /// Check if current settings match a preset
    var matchingPreset: ThemePreset? {
        ThemePreset.all.first { $0.primary == primaryColor && $0.background == backgroundStyle }
    }

    private init() {
        // Load saved preferences or use system-aware defaults
        if let savedPrimary = UserDefaults.standard.string(forKey: "stitch_primary_color"),
           let primary = PrimaryColor(rawValue: savedPrimary) {
            self.primaryColor = primary
        } else {
            self.primaryColor = .coral
        }

        if let savedBg = UserDefaults.standard.string(forKey: "stitch_background_style"),
           let bg = BackgroundStyle(rawValue: savedBg) {
            self.backgroundStyle = bg
        } else {
            // Default based on system appearance
            let systemIsDark = UITraitCollection.current.userInterfaceStyle == .dark
            self.backgroundStyle = systemIsDark ? .darkGray : .white
        }
    }

    func applyPreset(_ preset: ThemePreset) {
        primaryColor = preset.primary
        backgroundStyle = preset.background
    }
}
