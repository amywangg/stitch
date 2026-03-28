import SwiftUI

struct YarnSelectionView: View {
    @Bindable var viewModel: AIPatternBuilderViewModel
    @Environment(ThemeManager.self) private var theme
    @State private var showStashPicker = false
    @State private var showNeedlePicker = false

    private let weightOptions = [
        "lace", "fingering", "sport", "dk",
        "worsted", "aran", "bulky", "super_bulky",
    ]

    private let needleSuggestions: [String: Double] = [
        "lace": 2.25, "fingering": 2.75, "sport": 3.5, "dk": 4.0,
        "worsted": 4.5, "aran": 5.5, "bulky": 6.5, "super_bulky": 10.0,
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Recommended weights hint
                if let rec = viewModel.selectedProjectConfig?.recommendedYarnWeights, !rec.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "lightbulb.fill")
                            .font(.caption)
                            .foregroundStyle(.orange)
                        Text("Recommended: \(rec.map(formatWeight).joined(separator: ", "))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.horizontal, 20)
                }

                // Yarn entries
                ForEach(Array(viewModel.yarns.enumerated()), id: \.element.id) { index, yarn in
                    yarnCard(index: index, yarn: yarn)
                }

                // Add yarn button
                if viewModel.yarns.count < 5 {
                    HStack(spacing: 12) {
                        Button {
                            viewModel.yarns.append(YarnEntry())
                        } label: {
                            Label("Add yarn manually", systemImage: "plus.circle")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(theme.primary)
                        }

                        Button {
                            showStashPicker = true
                        } label: {
                            Label("From stash", systemImage: "tray.full")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(theme.primary)
                        }
                    }
                    .padding(.horizontal, 20)
                }

                // Needle suggestion
                if let firstWeight = viewModel.yarns.first?.weight,
                   let suggestedNeedle = needleSuggestions[firstWeight] {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Image(systemName: "pin")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text("Suggested needle: \(String(format: "%.1f", suggestedNeedle))mm")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }

                        if !viewModel.needleSizeOverride.isEmpty {
                            HStack {
                                Text("Selected: \(viewModel.needleSizeOverride)mm")
                                    .font(.subheadline.weight(.medium))
                                Button {
                                    viewModel.needleSizeOverride = ""
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .font(.caption)
                                        .foregroundStyle(.tertiary)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    .padding(16)
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .padding(.horizontal, 20)
                }
            }
            .padding(.vertical, 16)
        }
        .sheet(isPresented: $showStashPicker) {
            StashPickerSheet { stashItemId in
                Task {
                    do {
                        let response: APIResponse<StashItem> = try await APIClient.shared.get(
                            "/stash/\(stashItemId)"
                        )
                        viewModel.addYarnFromStash(response.data)
                    } catch {}
                }
            }
        }
    }

    private func yarnCard(index: Int, yarn: YarnEntry) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Yarn \(index + 1)")
                    .font(.subheadline.weight(.semibold))
                Spacer()
                if viewModel.yarns.count > 1 {
                    Button {
                        viewModel.removeYarn(at: index)
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.tertiary)
                    }
                    .buttonStyle(.plain)
                }
            }

            TextField("Yarn name", text: binding(for: index, keyPath: \.name))
                .textFieldStyle(.roundedBorder)

            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Weight")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Picker("Weight", selection: binding(for: index, keyPath: \.weight)) {
                        ForEach(weightOptions, id: \.self) { w in
                            Text(formatWeight(w)).tag(w)
                        }
                    }
                    .pickerStyle(.menu)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Strands")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Stepper(
                        "\(viewModel.yarns[index].strands)",
                        value: binding(for: index, keyPath: \.strands),
                        in: 1...10
                    )
                }
            }

            TextField("Fiber content (optional)", text: binding(for: index, keyPath: \.fiberContent))
                .textFieldStyle(.roundedBorder)
                .font(.subheadline)
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .padding(.horizontal, 20)
    }

    private func binding<T>(for index: Int, keyPath: WritableKeyPath<YarnEntry, T>) -> Binding<T> {
        Binding(
            get: { viewModel.yarns[index][keyPath: keyPath] },
            set: { viewModel.yarns[index][keyPath: keyPath] = $0 }
        )
    }

    private func formatWeight(_ weight: String) -> String {
        switch weight {
        case "super_bulky": return "Super bulky"
        case "dk": return "DK"
        default: return weight.capitalized
        }
    }
}
