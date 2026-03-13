import SwiftUI
import PDFKit

/// Displays a PDF using PDFKit. Fetches a signed URL from the API,
/// downloads the PDF data, and renders it natively.
struct PDFViewerView: View {
    let pdfUploadId: String
    let fileName: String

    @State private var pdfDocument: PDFDocument?
    @State private var isLoading = true
    @State private var error: String?

    var body: some View {
        Group {
            if isLoading {
                ProgressView("Loading PDF...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let document = pdfDocument {
                PDFKitView(document: document)
                    .ignoresSafeArea(edges: .bottom)
            } else if let error {
                ContentUnavailableView {
                    Label("Unable to load PDF", systemImage: "exclamationmark.triangle")
                } description: {
                    Text(error)
                }
            }
        }
        .navigationTitle(fileName)
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadPDF() }
    }

    private func loadPDF() async {
        isLoading = true
        defer { isLoading = false }

        do {
            // Get signed URL from API
            let response: APIResponse<PdfSignedUrl> = try await APIClient.shared.get("/pdf/\(pdfUploadId)")
            guard let url = URL(string: response.data.url) else {
                error = "Invalid PDF URL"
                return
            }

            // Download PDF data
            let (data, _) = try await URLSession.shared.data(from: url)
            guard let document = PDFDocument(data: data) else {
                error = "Could not parse PDF file"
                return
            }

            pdfDocument = document
        } catch {
            self.error = error.localizedDescription
        }
    }
}

/// UIViewRepresentable wrapper for PDFKit's PDFView.
struct PDFKitView: UIViewRepresentable {
    let document: PDFDocument

    func makeUIView(context: Context) -> PDFView {
        let pdfView = PDFView()
        pdfView.autoScales = true
        pdfView.displayMode = .singlePageContinuous
        pdfView.displayDirection = .vertical
        pdfView.document = document
        return pdfView
    }

    func updateUIView(_ pdfView: PDFView, context: Context) {
        pdfView.document = document
    }
}
