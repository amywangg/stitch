import SwiftUI
import UniformTypeIdentifiers

struct PDFUploadView: View {
    var onUploaded: ((PdfUpload) -> Void)?

    @State private var isPickerPresented = false
    @State private var isUploading = false
    @State private var errorMessage: String?
    @State private var uploadedPdf: PdfUpload?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                if let pdf = uploadedPdf {
                    // Success state
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(.green)

                    Text("PDF uploaded")
                        .font(.headline)

                    Text(pdf.fileName)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    Button("Done") {
                        onUploaded?(pdf)
                        dismiss()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color(hex: "#FF6B6B"))
                } else if isUploading {
                    ProgressView()
                        .scaleEffect(1.2)

                    Text("Uploading...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                } else {
                    Image(systemName: "doc.badge.plus")
                        .font(.system(size: 48))
                        .foregroundStyle(Color(hex: "#FF6B6B"))

                    Text("Upload pattern PDF")
                        .font(.headline)

                    Text("Select a PDF from Files, iCloud, Google Drive, or any connected storage.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)

                    Button {
                        isPickerPresented = true
                    } label: {
                        Label("Choose PDF", systemImage: "folder")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color(hex: "#FF6B6B"))
                    .padding(.horizontal, 40)
                }

                if let error = errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
            }
            .padding()
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .navigationTitle("Upload PDF")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    if uploadedPdf == nil {
                        Button("Cancel") { dismiss() }
                    }
                }
            }
            .fileImporter(
                isPresented: $isPickerPresented,
                allowedContentTypes: [UTType.pdf],
                allowsMultipleSelection: false
            ) { result in
                handleFileSelection(result)
            }
        }
    }

    private func handleFileSelection(_ result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            guard let url = urls.first else { return }
            Task { await uploadFile(url: url) }
        case .failure(let error):
            errorMessage = error.localizedDescription
        }
    }

    @MainActor
    private func uploadFile(url: URL) async {
        guard url.startAccessingSecurityScopedResource() else {
            errorMessage = "Cannot access the selected file."
            return
        }
        defer { url.stopAccessingSecurityScopedResource() }

        isUploading = true
        errorMessage = nil

        do {
            let data = try Data(contentsOf: url)

            let response: APIResponse<PdfUpload> = try await APIClient.shared.upload(
                "/pdf/upload",
                imageData: data,
                mimeType: "application/pdf",
                fileName: url.lastPathComponent
            )

            uploadedPdf = response.data
        } catch let error as APIError {
            switch error {
            case .httpError(let code, let body):
                if code == 403 {
                    if let json = try? JSONSerialization.jsonObject(with: body) as? [String: Any],
                       let message = json["message"] as? String {
                        errorMessage = message
                    } else {
                        errorMessage = "Limit reached. Upgrade to Pro for more."
                    }
                } else {
                    errorMessage = error.localizedDescription
                }
            default:
                errorMessage = error.localizedDescription
            }
        } catch {
            errorMessage = error.localizedDescription
        }

        isUploading = false
    }
}
