import SwiftUI

struct SizeSelectionView: View {
    @Bindable var viewModel: AIPatternBuilderViewModel
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if viewModel.isDimensionBased {
                    dimensionInputs
                } else {
                    sizeGrid
                }
            }
            .padding(.vertical, 16)
        }
    }

    // MARK: - Standard Sizes

    private var sizeGrid: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Select a size")
                .font(.title3.weight(.semibold))
                .padding(.horizontal, 20)

            // Use my measurements button
            Button {
                Task { await viewModel.loadMeasurements() }
            } label: {
                HStack(spacing: 8) {
                    if viewModel.isLoadingMeasurements {
                        ProgressView()
                            .controlSize(.small)
                    } else {
                        Image(systemName: "ruler")
                            .font(.subheadline)
                    }
                    Text("Use my measurements")
                        .font(.subheadline.weight(.medium))
                }
                .foregroundStyle(theme.primary)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Color(.secondarySystemGroupedBackground), in: Capsule())
            }
            .buttonStyle(.plain)
            .disabled(viewModel.isLoadingMeasurements)
            .padding(.horizontal, 20)

            if viewModel.userMeasurements != nil && viewModel.userMeasurements!.isEmpty {
                Text("No measurements saved yet")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 20)
            }

            let sizes = viewModel.availableSizes

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 10),
                GridItem(.flexible(), spacing: 10),
                GridItem(.flexible(), spacing: 10),
            ], spacing: 10) {
                ForEach(sizes, id: \.self) { size in
                    sizeCard(size)
                }
            }
            .padding(.horizontal, 20)

            // Show measurements for selected size
            if let size = viewModel.targetSize,
               let measurements = viewModel.sizeChartForProject[size] {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Measurements")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .textCase(.uppercase)

                    ForEach(Array(measurements.sorted(by: { $0.key < $1.key })), id: \.key) { key, value in
                        HStack {
                            Text(formatMeasurementKey(key))
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text("\(String(format: "%.1f", value)) cm")
                                .font(.subheadline.weight(.medium))
                        }
                    }
                }
                .padding(16)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .padding(.horizontal, 20)
            }
        }
    }

    private func sizeCard(_ size: String) -> some View {
        let isSelected = viewModel.targetSize == size
        return Button {
            withAnimation(.easeInOut(duration: 0.15)) {
                viewModel.targetSize = size
            }
        } label: {
            VStack(spacing: 4) {
                Text(size)
                    .font(.subheadline.weight(isSelected ? .semibold : .regular))
                    .foregroundStyle(isSelected ? .white : .primary)
                if size == viewModel.recommendedSizeName {
                    Text("Recommended")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(isSelected ? .white.opacity(0.9) : Color(hex: "#4ECDC4"))
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(
                isSelected ? AnyShapeStyle(theme.primary) : AnyShapeStyle(Color(.secondarySystemGroupedBackground)),
                in: RoundedRectangle(cornerRadius: 10)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Dimension Inputs

    private var dimensionInputs: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Choose dimensions")
                .font(.title3.weight(.semibold))
                .padding(.horizontal, 20)

            // Preset sizes as quick picks
            let sizes = viewModel.availableSizes
            if !sizes.isEmpty {
                Text("Quick presets")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                    .padding(.horizontal, 20)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(sizes, id: \.self) { size in
                            Button {
                                viewModel.targetSize = size
                                if let measurements = viewModel.sizeChartForProject[size] {
                                    viewModel.customMeasurements = measurements
                                }
                            } label: {
                                Text(size)
                                    .font(.caption.weight(.medium))
                                    .foregroundStyle(viewModel.targetSize == size ? .white : .primary)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 8)
                                    .background(
                                        viewModel.targetSize == size ?
                                            AnyShapeStyle(theme.primary) :
                                            AnyShapeStyle(Color(.secondarySystemGroupedBackground)),
                                        in: Capsule()
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 20)
                }
            }

            // Custom dimension fields
            VStack(alignment: .leading, spacing: 12) {
                Text("Custom dimensions")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)

                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Width (cm)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        TextField(
                            "Width",
                            text: dimensionBinding("width_cm")
                        )
                        .keyboardType(.decimalPad)
                        .textFieldStyle(.roundedBorder)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Length (cm)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        TextField(
                            "Length",
                            text: dimensionBinding("length_cm")
                        )
                        .keyboardType(.decimalPad)
                        .textFieldStyle(.roundedBorder)
                    }
                }
            }
            .padding(16)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .padding(.horizontal, 20)
        }
    }

    private func dimensionBinding(_ key: String) -> Binding<String> {
        Binding(
            get: {
                if let val = viewModel.customMeasurements[key] {
                    return String(format: "%.0f", val)
                }
                return ""
            },
            set: {
                if let val = Double($0) {
                    viewModel.customMeasurements[key] = val
                } else if $0.isEmpty {
                    viewModel.customMeasurements.removeValue(forKey: key)
                }
            }
        )
    }

    private func formatMeasurementKey(_ key: String) -> String {
        key.replacingOccurrences(of: "_cm", with: "")
            .replacingOccurrences(of: "_", with: " ")
            .capitalized
    }
}
