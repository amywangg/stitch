import SwiftUI

struct ThemeSettingsView: View {
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        @Bindable var theme = theme

        List {
            // MARK: - Presets

            Section("Presets") {
                LazyVGrid(columns: [
                    GridItem(.flexible(), spacing: 12),
                    GridItem(.flexible(), spacing: 12)
                ], spacing: 12) {
                    ForEach(ThemePreset.all) { preset in
                        PresetCard(
                            preset: preset,
                            isSelected: theme.matchingPreset?.id == preset.id
                        ) {
                            withAnimation(.easeInOut(duration: 0.25)) {
                                theme.applyPreset(preset)
                            }
                        }
                    }
                }
                .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16))
                .listRowBackground(Color.clear)
            }

            // MARK: - Primary color

            Section("Accent color") {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 6), spacing: 12) {
                    ForEach(PrimaryColor.allCases) { color in
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                theme.primaryColor = color
                            }
                        } label: {
                            Circle()
                                .fill(color.color)
                                .frame(width: 40, height: 40)
                                .overlay {
                                    if theme.primaryColor == color {
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundStyle(.white)
                                    }
                                }
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(color.name)
                    }
                }
                .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16))
            }

            // MARK: - Background

            Section("Background") {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Light")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    HStack(spacing: 10) {
                        ForEach(BackgroundStyle.lightOptions) { bg in
                            BackgroundSwatch(
                                style: bg,
                                isSelected: theme.backgroundStyle == bg
                            ) {
                                withAnimation(.easeInOut(duration: 0.25)) {
                                    theme.backgroundStyle = bg
                                }
                            }
                        }
                    }

                    Text("Dark")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.top, 4)

                    HStack(spacing: 10) {
                        ForEach(BackgroundStyle.darkOptions) { bg in
                            BackgroundSwatch(
                                style: bg,
                                isSelected: theme.backgroundStyle == bg
                            ) {
                                withAnimation(.easeInOut(duration: 0.25)) {
                                    theme.backgroundStyle = bg
                                }
                            }
                        }
                    }
                }
                .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16))
            }

            // MARK: - Preview

            Section("Preview") {
                VStack(spacing: 12) {
                    HStack(spacing: 12) {
                        RoundedRectangle(cornerRadius: 10)
                            .fill(theme.primary)
                            .frame(height: 44)
                            .overlay {
                                Text("Primary button")
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(.white)
                            }

                        RoundedRectangle(cornerRadius: 10)
                            .fill(theme.surface)
                            .frame(height: 44)
                            .overlay {
                                Text("Secondary")
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(theme.textPrimary)
                            }
                    }

                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Sample project")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(theme.textPrimary)
                            Text("Row 24 of 180")
                                .font(.caption)
                                .foregroundStyle(theme.textSecondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundStyle(theme.textSecondary)
                    }
                    .padding(12)
                    .background(theme.surface, in: RoundedRectangle(cornerRadius: 10))
                }
                .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16))
                .listRowBackground(theme.background)
            }
        }
        .listStyle(.plain)
        .navigationTitle("Appearance")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Preset Card

private struct PresetCard: View {
    @Environment(ThemeManager.self) private var theme
    let preset: ThemePreset
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 0) {
                // Mini preview
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(preset.background.color)
                        .frame(height: 60)

                    VStack(spacing: 4) {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(preset.primary.color)
                            .frame(width: 50, height: 8)
                        RoundedRectangle(cornerRadius: 2)
                            .fill(preset.background.isDark ? Color.white.opacity(0.2) : Color.black.opacity(0.1))
                            .frame(width: 70, height: 5)
                        RoundedRectangle(cornerRadius: 2)
                            .fill(preset.background.isDark ? Color.white.opacity(0.2) : Color.black.opacity(0.1))
                            .frame(width: 55, height: 5)
                    }
                }

                Text(preset.name)
                    .font(.caption.weight(.medium))
                    .padding(.top, 6)
            }
            .padding(8)
            .background {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(.secondarySystemGroupedBackground))
            }
            .overlay {
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? preset.primary.color : .clear, lineWidth: 2)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(preset.name) theme")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

// MARK: - Background Swatch

private struct BackgroundSwatch: View {
    let style: BackgroundStyle
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                RoundedRectangle(cornerRadius: 8)
                    .fill(style.color)
                    .frame(height: 44)
                    .overlay {
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(style.isDark ? Color.white.opacity(0.15) : Color.black.opacity(0.1), lineWidth: 1)
                    }
                    .overlay {
                        if isSelected {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 16))
                                .foregroundStyle(.white, style.isDark ? Color.white.opacity(0.4) : Color.black.opacity(0.3))
                        }
                    }

                Text(style.name)
                    .font(.system(size: 10))
                    .foregroundStyle(.secondary)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(style.name) background")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}
