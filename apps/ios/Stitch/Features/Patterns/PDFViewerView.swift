import SwiftUI
import PDFKit

/// Displays a PDF using PDFKit with full markup/annotation support.
/// Fetches a signed URL from the API, downloads the PDF data,
/// and renders it with the markup toolbar.
struct PDFViewerView: View {
    let pdfUploadId: String
    let fileName: String

    var body: some View {
        PDFMarkupView(pdfUploadId: pdfUploadId, fileName: fileName)
    }
}

/// Displays a PDF from raw Data (e.g., generated PDFs).
struct PDFDataViewerView: View {
    let pdfData: Data
    let fileName: String

    var body: some View {
        Group {
            if let document = PDFDocument(data: pdfData) {
                PDFKitView(document: document)
                    .ignoresSafeArea(edges: .bottom)
            } else {
                ContentUnavailableView {
                    Label("Unable to display PDF", systemImage: "exclamationmark.triangle")
                } description: {
                    Text("The generated PDF data could not be parsed.")
                }
            }
        }
        .navigationTitle(fileName)
        .navigationBarTitleDisplayMode(.inline)
    }
}

/// UIViewRepresentable wrapper for PDFKit's PDFView (read-only).
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
