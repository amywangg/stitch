import SwiftUI

struct StitchButton: View {
    enum Style { case primary, secondary, destructive }

    @Environment(ThemeManager.self) private var theme
    let title: String
    let style: Style
    let action: () async -> Void

    init(_ title: String, style: Style = .primary, action: @escaping () async -> Void) {
        self.title = title
        self.style = style
        self.action = action
    }

    // Sync convenience overload
    init(_ title: String, style: Style = .primary, action: @escaping () -> Void) {
        self.title = title
        self.style = style
        self.action = { action() }
    }

    var body: some View {
        Button {
            Task { await action() }
        } label: {
            Text(title)
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(backgroundColor)
                .foregroundStyle(foregroundColor)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }

    private var backgroundColor: Color {
        switch style {
        case .primary:    return theme.primary
        case .secondary:  return Color(.systemGray5)
        case .destructive: return Color.red
        }
    }

    private var foregroundColor: Color {
        switch style {
        case .primary, .destructive: return .white
        case .secondary: return .primary
        }
    }
}
