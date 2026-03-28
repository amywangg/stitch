import SwiftUI

struct BuilderOptionPill: View {
    let option: BuilderQuestionOption
    let isSelected: Bool
    let action: () -> Void
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 3) {
                Text(option.label)
                    .font(.subheadline.weight(isSelected ? .semibold : .regular))
                    .foregroundStyle(isSelected ? .white : .primary)
                if let desc = option.description, isSelected {
                    Text(desc)
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.8))
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(
                isSelected ? AnyShapeStyle(theme.primary) : AnyShapeStyle(Color(.secondarySystemGroupedBackground)),
                in: Capsule()
            )
        }
        .buttonStyle(.plain)
    }
}
