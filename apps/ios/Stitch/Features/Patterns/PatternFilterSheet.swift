import SwiftUI

// MARK: - Pattern Filter Sheet

struct PatternFilterSheet: View {
    @Environment(ThemeManager.self) private var theme
    @Bindable var viewModel: PatternDiscoverViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var designerText = ""

    var body: some View {
        NavigationStack {
            Form {
                // Yarn weight
                Section("Yarn weight") {
                    Picker("Weight", selection: Binding(
                        get: { viewModel.weight ?? "" },
                        set: { viewModel.weight = $0.isEmpty ? nil : $0 }
                    )) {
                        Text("Any").tag("")
                        ForEach(PatternDiscoverViewModel.yarnWeights, id: \.value) { w in
                            Text(w.label).tag(w.value)
                        }
                    }
                    .pickerStyle(.navigationLink)
                }

                // Fit / Size
                Section("Fit / Size") {
                    Picker("Fit", selection: Binding(
                        get: { viewModel.fit ?? "" },
                        set: { viewModel.fit = $0.isEmpty ? nil : $0 }
                    )) {
                        Text("Any").tag("")
                        ForEach(PatternDiscoverViewModel.fitOptions, id: \.value) { f in
                            Text(f.label).tag(f.value)
                        }
                    }
                    .pickerStyle(.navigationLink)
                }

                // Difficulty
                Section("Difficulty") {
                    Picker("Skill level", selection: Binding(
                        get: { viewModel.difficulty ?? "" },
                        set: { viewModel.difficulty = $0.isEmpty ? nil : $0 }
                    )) {
                        Text("Any").tag("")
                        ForEach(PatternDiscoverViewModel.difficultyOptions, id: \.value) { d in
                            Text(d.label).tag(d.value)
                        }
                    }
                    .pickerStyle(.navigationLink)
                }

                // Designer
                Section("Designer") {
                    HStack {
                        TextField("Designer name", text: $designerText)
                            .textInputAutocapitalization(.words)
                            .onSubmit {
                                viewModel.designer = designerText.trimmingCharacters(in: .whitespaces).isEmpty
                                    ? nil
                                    : designerText.trimmingCharacters(in: .whitespaces)
                            }
                        if !designerText.isEmpty {
                            Button {
                                designerText = ""
                                viewModel.designer = nil
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundStyle(.secondary)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                // Other options
                Section {
                    Toggle("With photos only", isOn: $viewModel.photosOnly)
                    Toggle("Hide patterns in library", isOn: $viewModel.hideOwned)
                }

                // Clear all
                if viewModel.activeFilterCount > 0 {
                    Section {
                        Button("Clear all filters", role: .destructive) {
                            designerText = ""
                            viewModel.clearAllFilters()
                            dismiss()
                        }
                    }
                }
            }
            .navigationTitle("Filters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Apply") {
                        // Commit designer text
                        let trimmed = designerText.trimmingCharacters(in: .whitespaces)
                        viewModel.designer = trimmed.isEmpty ? nil : trimmed
                        viewModel.search()
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
            .onAppear {
                designerText = viewModel.designer ?? ""
            }
        }
        .presentationDetents([.medium, .large])
    }
}
