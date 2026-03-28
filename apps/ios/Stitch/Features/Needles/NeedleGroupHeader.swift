import SwiftUI

// MARK: - Needle Set Section Header

struct NeedleSetSectionHeader: View {
    @Environment(ThemeManager.self) private var theme
    let group: NeedlesViewModel.NeedleGroup
    let isExpanded: Bool
    let onToggle: () -> Void
    let onDeleteSet: () -> Void

    var body: some View {
        Button {
            withAnimation(.snappy(duration: 0.3)) {
                onToggle()
            }
        } label: {
            HStack(spacing: 10) {
                // Small thumbnail when collapsed, or set icon
                if let imageUrl = group.imageUrl, !imageUrl.isEmpty,
                   let url = URL(string: imageUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            RoundedRectangle(cornerRadius: 6)
                                .fill(theme.primary.opacity(0.1))
                                .overlay {
                                    Image(systemName: "rectangle.stack.fill")
                                        .font(.caption)
                                        .foregroundStyle(theme.primary.opacity(0.5))
                                }
                        }
                    }
                    .frame(width: 36, height: 36)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                } else {
                    Image(systemName: "rectangle.stack.fill")
                        .font(.title3)
                        .foregroundStyle(theme.primary)
                        .frame(width: 36)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(group.title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.primary)
                    if let subtitle = group.subtitle {
                        Text(subtitle)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                Text("\(group.items.count) items")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .rotationEffect(.degrees(isExpanded ? 90 : 0))
            }
        }
        .buttonStyle(.plain)
        .listRowBackground(theme.primary.opacity(0.04))
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            Button(role: .destructive) {
                onDeleteSet()
            } label: {
                Label("Delete set", systemImage: "trash")
            }
        }
        .contextMenu {
            Button(role: .destructive) {
                onDeleteSet()
            } label: {
                Label("Delete set", systemImage: "trash")
            }
        }
    }
}
