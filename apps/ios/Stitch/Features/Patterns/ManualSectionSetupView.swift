import SwiftUI

struct ManualSectionSetupView: View {
    @Bindable var viewModel: StartPatternFlowViewModel
    @Environment(ThemeManager.self) private var theme
    @State private var showPdfViewer = false

    var body: some View {
        VStack(spacing: 0) {
            // Header
            if let pattern = viewModel.pattern {
                patternHeader(pattern)
            }

            List {
                Section {
                    ForEach($viewModel.manualSections) { $section in
                        HStack(spacing: 12) {
                            TextField("Section name", text: $section.name)
                                .font(.body)

                            Divider()

                            TextField("Rows", value: $section.targetRows, format: .number)
                                .font(.body)
                                .keyboardType(.numberPad)
                                .frame(width: 70)
                                .multilineTextAlignment(.trailing)
                        }
                    }
                    .onDelete { viewModel.removeSection(at: $0) }

                    Button {
                        withAnimation { viewModel.addSection() }
                    } label: {
                        Label("Add section", systemImage: "plus.circle.fill")
                            .font(.subheadline)
                            .foregroundStyle(theme.primary)
                    }
                } header: {
                    Text("Sections")
                } footer: {
                    Text("Add a section for each part of the pattern (e.g. Ribbing, Body, Sleeves). Row counts are optional.")
                }

                // View PDF button if available
                if viewModel.hasPdf {
                    Section {
                        Button {
                            showPdfViewer = true
                        } label: {
                            Label("View pattern PDF", systemImage: "doc.text")
                                .font(.subheadline)
                        }
                    } footer: {
                        Text("Open the PDF to reference section names and row counts while setting up.")
                    }
                }
            }

            // Continue button
            VStack {
                Button {
                    viewModel.continueFromManualSetup()
                } label: {
                    Text("Continue")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(theme.primary)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .padding(.horizontal)
                .padding(.bottom, 8)
            }
            .background(.bar)
        }
        .sheet(isPresented: $showPdfViewer) {
            if let pattern = viewModel.pattern, let pdfId = pattern.firstPdfUploadId {
                NavigationStack {
                    PDFViewerView(pdfUploadId: pdfId, fileName: pattern.title)
                        .toolbar {
                            ToolbarItem(placement: .cancellationAction) {
                                Button("Done") { showPdfViewer = false }
                            }
                        }
                }
            }
        }
    }

    // MARK: - Pattern Header

    private func patternHeader(_ pattern: Pattern) -> some View {
        HStack(spacing: 12) {
            if let coverUrl = pattern.coverImageUrl, let url = URL(string: coverUrl) {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color(.systemGray5)
                }
                .frame(width: 44, height: 58)
                .clipShape(RoundedRectangle(cornerRadius: 6))
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(pattern.title)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)
                if let designer = pattern.designerName {
                    Text("by \(designer)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
    }
}
