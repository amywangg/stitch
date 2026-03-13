import SwiftUI

/// Lets the user pick from their uploaded PDFs or upload a new one.
/// Used when attaching a PDF to a project or queue item.
struct PDFPickerView: View {
    var onSelected: (PdfUpload) -> Void

    @Environment(ThemeManager.self) private var theme
    @State private var uploads: [PdfUpload] = []
    @State private var isLoading = false
    @State private var error: String?
    @State private var showUploadSheet = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if isLoading && uploads.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if uploads.isEmpty {
                    ContentUnavailableView {
                        Label("No PDFs uploaded", systemImage: "doc")
                    } description: {
                        Text("Upload a pattern PDF to attach it here.")
                    } actions: {
                        Button("Upload PDF") { showUploadSheet = true }
                            .buttonStyle(.borderedProminent)
                            .tint(theme.primary)
                    }
                } else {
                    List {
                        ForEach(uploads) { pdf in
                            Button {
                                onSelected(pdf)
                                dismiss()
                            } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: "doc.fill")
                                        .foregroundStyle(theme.primary)
                                        .font(.title3)

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(pdf.fileName)
                                            .font(.subheadline.weight(.medium))
                                            .foregroundStyle(.primary)
                                            .lineLimit(2)

                                        Text(ByteCountFormatter.string(fromByteCount: Int64(pdf.fileSize), countStyle: .file))
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }

                                    Spacer()

                                    Image(systemName: "chevron.right")
                                        .font(.caption)
                                        .foregroundStyle(.tertiary)
                                }
                                .padding(.vertical, 4)
                            }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Attach PDF")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showUploadSheet = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showUploadSheet) {
                PDFUploadView { newUpload in
                    uploads.insert(newUpload, at: 0)
                }
            }
            .task { await loadUploads() }
        }
    }

    private func loadUploads() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<PaginatedData<PdfUpload>> = try await APIClient.shared.get("/pdf?pageSize=50")
            uploads = response.data.items
        } catch {
            self.error = error.localizedDescription
        }
    }
}
