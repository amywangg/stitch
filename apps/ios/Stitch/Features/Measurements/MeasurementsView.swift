import SwiftUI

// MARK: - Measurements View (Settings)

struct MeasurementsView: View {
    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = MeasurementsViewModel()

    var body: some View {
        ScrollView {
            MeasurementsForm(viewModel: viewModel, isOnboarding: false)
                .padding(.bottom, 40)
        }
        .navigationTitle("My measurements")
        .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await viewModel.save() }
                    } label: {
                        if viewModel.isSaving {
                            ProgressView().controlSize(.small)
                        } else {
                            Text("Save")
                                .fontWeight(.semibold)
                        }
                    }
                    .disabled(viewModel.isSaving)
                }
            }
            .task { await viewModel.load() }
            .errorAlert(error: $viewModel.error)
    }
}

// MARK: - Onboarding Measurements Step

struct OnboardingMeasurementsStep: View {
    @Bindable var viewModel: MeasurementsViewModel
    let onContinue: () -> Void
    let onSkip: () -> Void
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        VStack(spacing: 0) {
            // Skip button
            Button("Set up later") {
                onSkip()
            }
            .font(.subheadline)
            .foregroundStyle(Color(hex: "#636366"))
            .frame(maxWidth: .infinity, alignment: .trailing)
            .padding(.horizontal, 28)
            .padding(.top, 20)

            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 10) {
                        ZStack {
                            Circle()
                                .fill(theme.primary.opacity(0.12))
                                .frame(width: 90, height: 90)
                            Image(systemName: "figure.stand")
                                .font(.system(size: 38, weight: .medium))
                                .foregroundStyle(theme.primary)
                        }

                        Text("Your measurements")
                            .font(.title2.bold())
                            .foregroundStyle(.white)
                        Text("Helps us recommend the right pattern size.\nAll fields are optional.")
                            .font(.subheadline)
                            .foregroundStyle(Color(hex: "#8E8E93"))
                            .multilineTextAlignment(.center)
                            .lineSpacing(3)
                    }
                    .padding(.top, 12)

                    MeasurementsForm(viewModel: viewModel, isOnboarding: true)
                }
                .padding(.bottom, 100) // room for button
            }

            // Continue button
            VStack(spacing: 0) {
                Divider().opacity(0.3)
                AuthPrimaryButton(
                    title: viewModel.hasAnyMeasurement ? "Save & continue" : "Continue",
                    isLoading: viewModel.isSaving,
                    disabled: viewModel.isSaving
                ) {
                    if viewModel.hasAnyMeasurement {
                        Task {
                            await viewModel.save()
                            onContinue()
                        }
                    } else {
                        onContinue()
                    }
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 16)
            }
            .background(Color(hex: "#0A0A0A").opacity(0.95))
        }
    }
}

// MARK: - Shared Form

struct MeasurementsForm: View {
    @Bindable var viewModel: MeasurementsViewModel
    let isOnboarding: Bool
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        VStack(spacing: 20) {
            // Unit toggle
            unitToggle

            // Quick size picker
            quickSizePicker

            // Sections
            measurementSection("Upper body", icon: "tshirt") {
                measurementRow("Bust / chest", value: $viewModel.bust)
                measurementRow("Waist", value: $viewModel.waist)
                measurementRow("Hip", value: $viewModel.hip)
                measurementRow("Shoulder width", value: $viewModel.shoulderWidth)
                measurementRow("Back length", value: $viewModel.backLength)
                measurementRow("Arm length", value: $viewModel.armLength)
                measurementRow("Upper arm", value: $viewModel.upperArm)
                measurementRow("Wrist", value: $viewModel.wrist)
            }

            measurementSection("Head", icon: "brain.head.profile") {
                measurementRow("Head circumference", value: $viewModel.headCircumference)
            }

            measurementSection("Lower body", icon: "figure.walk") {
                measurementRow("Height", value: $viewModel.height)
                measurementRow("Inseam", value: $viewModel.inseam)
            }

            measurementSection("Feet", icon: "shoe") {
                shoeSizePicker
                measurementRow("Foot length", value: $viewModel.footLength)
                measurementRow("Foot circumference", value: $viewModel.footCircumference)
            }
        }
        .padding(.horizontal, isOnboarding ? 24 : 16)
    }

    // MARK: - Unit Toggle

    private var unitToggle: some View {
        HStack(spacing: 0) {
            unitButton("cm", selected: !viewModel.useInches)
            unitButton("inches", selected: viewModel.useInches)
        }
        .background(isOnboarding ? Color(hex: "#1C1C1E") : Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .padding(.horizontal, isOnboarding ? 0 : 0)
    }

    private func unitButton(_ label: String, selected: Bool) -> some View {
        Button {
            if (label == "cm" && viewModel.useInches) || (label == "inches" && !viewModel.useInches) {
                viewModel.toggleUnit()
            }
        } label: {
            Text(label)
                .font(.subheadline.weight(selected ? .semibold : .regular))
                .foregroundStyle(selected ? .white : .secondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(
                    selected
                        ? theme.primary
                        : Color.clear,
                    in: RoundedRectangle(cornerRadius: 8)
                )
        }
        .buttonStyle(.plain)
        .padding(2)
    }

    // MARK: - Quick Size Picker

    private var quickSizePicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Quick start — pick your general size")
                .font(.caption)
                .foregroundStyle(isOnboarding ? Color(hex: "#8E8E93") : .secondary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(StandardSize.allCases) { size in
                        let selected = viewModel.selectedSize == size
                        Button {
                            viewModel.applySize(size)
                        } label: {
                            Text(size.label)
                                .font(.subheadline.weight(selected ? .semibold : .regular))
                                .foregroundStyle(selected ? .white : isOnboarding ? .white : .primary)
                                .frame(width: 44, height: 40)
                                .background(
                                    selected
                                        ? theme.primary
                                        : isOnboarding ? Color(hex: "#1C1C1E") : Color(.secondarySystemGroupedBackground),
                                    in: RoundedRectangle(cornerRadius: 10)
                                )
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .strokeBorder(
                                            selected ? Color.clear : isOnboarding ? Color(hex: "#2C2C2E") : Color.clear,
                                            lineWidth: 1
                                        )
                                )
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    // MARK: - Measurement Section

    private func measurementSection<Content: View>(
        _ title: String,
        icon: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundStyle(theme.primary)
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(isOnboarding ? .white : .primary)
            }

            VStack(spacing: 1) {
                content()
            }
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    // MARK: - Measurement Row

    private func measurementRow(_ label: String, value: Binding<String>) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(isOnboarding ? Color(hex: "#8E8E93") : .secondary)

            Spacer()

            HStack(spacing: 4) {
                TextField("—", text: value)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 60)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(isOnboarding ? .white : .primary)

                Text(viewModel.unitLabel)
                    .font(.caption)
                    .foregroundStyle(isOnboarding ? Color(hex: "#636366") : Color.secondary)
                    .frame(width: 22, alignment: .leading)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 11)
        .background(isOnboarding ? Color(hex: "#1C1C1E") : Color(.secondarySystemGroupedBackground))
    }

    // MARK: - Shoe Size

    private var shoeSizePicker: some View {
        HStack {
            Text("Shoe size")
                .font(.subheadline)
                .foregroundStyle(isOnboarding ? Color(hex: "#8E8E93") : .secondary)

            Spacer()

            Picker("System", selection: $viewModel.shoeSystem) {
                ForEach(ShoeSystem.allCases) { sys in
                    Text(sys.label).tag(sys)
                }
            }
            .pickerStyle(.segmented)
            .frame(width: 130)

            Picker("Size", selection: Binding(
                get: { viewModel.shoeSize ?? 0 },
                set: { newVal in
                    viewModel.shoeSize = newVal == 0 ? nil : newVal
                    viewModel.applyShoeSize()
                }
            )) {
                Text("—").tag(0.0)
                ForEach(ShoeSize.sizes(for: viewModel.shoeSystem), id: \.self) { size in
                    Text(size.truncatingRemainder(dividingBy: 1) == 0
                         ? String(format: "%.0f", size)
                         : String(format: "%.1f", size))
                    .tag(size)
                }
            }
            .frame(width: 65)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(isOnboarding ? Color(hex: "#1C1C1E") : Color(.secondarySystemGroupedBackground))
    }
}
