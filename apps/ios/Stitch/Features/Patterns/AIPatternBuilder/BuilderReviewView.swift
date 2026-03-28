import SwiftUI

struct BuilderReviewView: View {
    @Bindable var viewModel: AIPatternBuilderViewModel
    @Environment(ThemeManager.self) private var theme
    @Environment(SubscriptionManager.self) private var subscriptionManager

    var body: some View {
        ZStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Review your pattern")
                        .font(.title3.weight(.semibold))
                        .padding(.horizontal, 20)

                    // Summary card
                    summaryCard
                        .padding(.horizontal, 20)

                    // Generate buttons
                    VStack(spacing: 12) {
                        // Primary: Template generation (all users)
                        Button {
                            Task { await viewModel.generateTemplate() }
                        } label: {
                            Text("Create pattern")
                                .font(.body.weight(.semibold))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(theme.primary, in: RoundedRectangle(cornerRadius: 14))
                        }
                        .buttonStyle(.plain)

                        if subscriptionManager.isPro {
                            // Secondary: AI generation (Pro only)
                            Button {
                                Task { await viewModel.generate() }
                            } label: {
                                VStack(spacing: 4) {
                                    HStack(spacing: 6) {
                                        Image(systemName: "sparkles")
                                            .font(.subheadline)
                                        Text("Generate with AI")
                                            .font(.body.weight(.semibold))
                                    }
                                    Text("Polished prose, ~15-30 seconds")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                .foregroundStyle(.primary)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 14))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .stroke(Color(.separator), lineWidth: 0.5)
                                )
                            }
                            .buttonStyle(.plain)
                        } else {
                            // Upsell for free users
                            Button {
                                // Opens paywall — SubscriptionManager handles this
                            } label: {
                                HStack(spacing: 4) {
                                    Image(systemName: "sparkles")
                                        .font(.caption)
                                    Text("Want richer instructions? Upgrade to Pro")
                                        .font(.caption)
                                }
                                .foregroundStyle(.secondary)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.vertical, 16)
            }

            // Generating overlay
            if viewModel.isGenerating {
                generatingOverlay
            }
        }
    }

    // MARK: - Summary Card

    private var summaryCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Project type
            if let config = viewModel.selectedProjectConfig {
                summaryRow(
                    icon: AIPatternBuilderViewModel.iconForProjectType(config.type),
                    label: "Project",
                    value: config.label
                )
            }

            Divider()

            // Yarns
            VStack(alignment: .leading, spacing: 6) {
                Label("Yarn", systemImage: "tag")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                ForEach(viewModel.yarns) { yarn in
                    HStack {
                        Text(yarn.name.isEmpty ? "Unnamed yarn" : yarn.name)
                            .font(.subheadline)
                        Spacer()
                        Text(formatWeight(yarn.weight))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        if yarn.strands > 1 {
                            Text("×\(yarn.strands)")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 1)
                                .background(theme.primary, in: Capsule())
                        }
                    }
                }
            }

            Divider()

            // Key options
            VStack(alignment: .leading, spacing: 6) {
                Label("Options", systemImage: "slider.horizontal.3")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)

                let questions = viewModel.visibleQuestions()
                ForEach(questions.prefix(8)) { question in
                    if let answer = viewModel.answers[question.key] {
                        HStack {
                            Text(question.label)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            Spacer()
                            if question.type == "boolean" {
                                Text(answer == "true" ? "Yes" : "No")
                                    .font(.subheadline.weight(.medium))
                            } else if let option = question.options?.first(where: { $0.value == answer }) {
                                Text(option.label)
                                    .font(.subheadline.weight(.medium))
                            } else {
                                Text(answer)
                                    .font(.subheadline.weight(.medium))
                            }
                        }
                    }
                }
            }

            Divider()

            // Size
            if let size = viewModel.targetSize {
                summaryRow(icon: "ruler", label: "Size", value: size)
            } else if !viewModel.customMeasurements.isEmpty {
                summaryRow(icon: "ruler", label: "Size", value: "Custom measurements")
            }

            // Gauge override
            if let sts = Double(viewModel.gaugeStitchesOverride),
               let rows = Double(viewModel.gaugeRowsOverride) {
                summaryRow(
                    icon: "square.grid.3x3",
                    label: "Gauge",
                    value: "\(String(format: "%.0f", sts)) sts × \(String(format: "%.0f", rows)) rows / 10cm"
                )
            }
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func summaryRow(icon: String, label: String, value: String) -> some View {
        HStack {
            Label(label, systemImage: icon)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.subheadline.weight(.medium))
        }
    }

    // MARK: - Generating Overlay

    private var generatingOverlay: some View {
        ZStack {
            Color.black.opacity(0.5)
                .ignoresSafeArea()

            VStack(spacing: 24) {
                Image(systemName: "sparkles")
                    .font(.system(size: 48))
                    .foregroundStyle(theme.primary)
                    .symbolEffect(.pulse, options: .repeating)

                VStack(spacing: 8) {
                    Text("Generating your pattern")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(.white)

                    Text("Calculating construction and writing instructions...")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.7))
                        .multilineTextAlignment(.center)
                }

                ProgressView()
                    .tint(.white)
                    .controlSize(.large)
            }
            .padding(40)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24))
            .padding(32)
        }
    }

    private func formatWeight(_ weight: String) -> String {
        switch weight {
        case "super_bulky": return "Super bulky"
        case "dk": return "DK"
        default: return weight.capitalized
        }
    }
}
