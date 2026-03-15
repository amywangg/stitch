import SwiftUI

struct SessionSummaryToast: View {
    let summary: SessionSummary
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "clock.fill")
                .font(.title3)
                .foregroundStyle(theme.primary)

            VStack(alignment: .leading, spacing: 2) {
                Text("\(summary.activeMinutes) min crafting")
                    .font(.subheadline.weight(.medium))
                if summary.rowsWorked > 0 {
                    Text("\(summary.rowsWorked) rows completed")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            Image(systemName: "xmark")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.1), radius: 8, y: 4)
        .padding(.horizontal, 20)
    }
}
