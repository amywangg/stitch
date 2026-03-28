import SwiftUI
import PDFKit

// MARK: - PDF Markup View
//
// All annotations render as CAShapeLayers on a transparent overlay — zero PDFKit annotations.
// When tool is active: PDFView disabled, overlay captures touches.
// When no tool: PDFView enabled, overlay disabled.

struct PDFMarkupView: View {
    let pdfUploadId: String
    let fileName: String

    @State private var pdfDocument: PDFDocument?
    @State private var isLoading = true
    @State private var error: String?
    @State private var manager: PDFAnnotationManager
    @State private var showNoteEditor = false
    @State private var editingNoteId: String?
    @State private var editingNoteText = ""
    @State private var editingNoteColor = "#FFF9C4"
    @State private var movingNoteId: String?
    @State private var rowCount = 0
    @State private var showResetConfirm = false

    init(pdfUploadId: String, fileName: String) {
        self.pdfUploadId = pdfUploadId; self.fileName = fileName
        self._manager = State(initialValue: PDFAnnotationManager(pdfUploadId: pdfUploadId))
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            VStack(spacing: 0) {
                Group {
                    if isLoading {
                        ProgressView("Loading PDF...").frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if let doc = pdfDocument {
                        MarkupPDFContainer(document: doc, manager: manager, movingNoteId: $movingNoteId,
                            onNoteTap: { id in movingNoteId = id },
                            onNewNote: { pt in handleNewNote(pt) },
                            onNoteEdit: { id, text, color in
                                editingNoteId = id; editingNoteText = text == "Note" ? "" : text
                                editingNoteColor = color; showNoteEditor = true
                            })
                            .ignoresSafeArea(edges: .bottom)
                    } else if let error {
                        ContentUnavailableView { Label("Error", systemImage: "exclamationmark.triangle") } description: { Text(error) }
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .overlay(alignment: .topTrailing) {
                    if pdfDocument != nil { rowCounter.padding(.trailing, 12).padding(.top, 8) }
                }
                if pdfDocument != nil { toolbar }
            }
            if movingNoteId != nil {
                Button { movingNoteId = nil } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark").font(.subheadline.weight(.bold))
                        Text("Done moving").font(.subheadline.weight(.semibold))
                    }.foregroundStyle(.white).padding(.horizontal, 20).padding(.vertical, 12)
                        .background(Color(hex: "#FF6B6B"), in: Capsule())
                        .shadow(color: .black.opacity(0.2), radius: 8, y: 4)
                }.padding(.bottom, 80).transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.spring(duration: 0.3), value: movingNoteId)
        .navigationTitle(fileName).navigationBarTitleDisplayMode(.inline)
        .task { await loadPDF() }
        .errorAlert(error: $manager.error)
        .sheet(isPresented: $showNoteEditor) {
            PDFNoteEditorSheet(text: $editingNoteText, colorHex: $editingNoteColor,
                onSave: saveNote, onDelete: editingNoteId != nil ? deleteNote : nil)
                .presentationDetents([.medium])
        }
        .confirmationDialog("Reset?", isPresented: $showResetConfirm, titleVisibility: .visible) {
            Button("Reset to original", role: .destructive) { manager.resetAll() }
            Button("Cancel", role: .cancel) {}
        } message: { Text("Remove all marks, highlights, and notes.") }
        .onDisappear { Task { await manager.saveOnDismiss() } }
    }

    private func handleNewNote(_ screenPoint: CGPoint) {
        let id = UUID().uuidString
        let b = AnnotationBounds(x: Double(screenPoint.x) - 60, y: Double(screenPoint.y) - 20, width: 120, height: 40)
        manager.addAnnotation(AnnotationRecord(id: id, type: "text", page: 0, bounds: b,
            color: manager.noteColor.hex, points: nil, text: "Note", width: nil))
        editingNoteId = id; editingNoteText = ""; editingNoteColor = manager.noteColor.hex
        showNoteEditor = true
    }

    private func saveNote() {
        guard let id = editingNoteId,
              let existing = manager.annotations.first(where: { $0.id == id }) else { return }
        let text = editingNoteText.trimmingCharacters(in: .whitespaces).isEmpty ? "Note" : editingNoteText.trimmingCharacters(in: .whitespaces)
        let w = min(max(Double(text.count) * 6, 80), 200)
        let h = Double(max(1, text.components(separatedBy: "\n").count)) * 14 + 8
        let b = existing.bounds ?? AnnotationBounds(x: 100, y: 100, width: w, height: h)
        manager.updateAnnotation(AnnotationRecord(id: id, type: "text", page: 0,
            bounds: AnnotationBounds(x: b.x, y: b.y, width: max(b.width, w), height: max(b.height, h)),
            color: editingNoteColor, points: nil, text: text, width: nil))
    }

    private func deleteNote() { if let id = editingNoteId { manager.removeAnnotation(id: id) } }

    private func loadPDF() async {
        isLoading = true; defer { isLoading = false }
        do {
            let resp: APIResponse<PdfSignedUrl> = try await APIClient.shared.get("/pdf/\(pdfUploadId)")
            guard let url = URL(string: resp.data.url) else { error = "Invalid URL"; return }
            let (data, _) = try await URLSession.shared.data(from: url)
            guard let doc = PDFDocument(data: data) else { error = "Bad PDF"; return }
            pdfDocument = doc; await manager.load()
        } catch { self.error = error.localizedDescription }
    }

    // MARK: - Toolbar

    private var toolbar: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                toolBtn(.highlight, "highlighter", "Highlight")
                toolBtn(.pen, "pencil.tip", "Pen")
                toolBtn(.text, "note.text", "Note")
                toolBtn(.eraser, "eraser", "Eraser")
                Divider().frame(height: 24).padding(.horizontal, 8)
                Button { manager.undo() } label: { Image(systemName: "arrow.uturn.backward").font(.body).frame(width: 36, height: 40) }.disabled(!manager.canUndo)
                Button { manager.redo() } label: { Image(systemName: "arrow.uturn.forward").font(.body).frame(width: 36, height: 40) }.disabled(!manager.canRedo)
                Spacer()
                if manager.isSaving { ProgressView().scaleEffect(0.7) }
                Menu { Button(role: .destructive) { showResetConfirm = true } label: { Label("Reset", systemImage: "arrow.counterclockwise") } }
                    label: { Image(systemName: "ellipsis.circle").font(.body).frame(width: 36, height: 40) }
            }.padding(.horizontal, 8).padding(.vertical, 4).background(Color(.secondarySystemGroupedBackground))
            if manager.activeTool == .pen { penOptions }
            if manager.activeTool == .highlight { highlightOptions }
        }
    }

    private func toolBtn(_ tool: AnnotationTool, _ icon: String, _ label: String) -> some View {
        Button { manager.activeTool = manager.activeTool == tool ? .none : tool } label: {
            VStack(spacing: 2) { Image(systemName: icon).font(.body).frame(width: 40, height: 28); Text(label).font(.caption2) }
                .foregroundStyle(manager.activeTool == tool ? Color(hex: "#FF6B6B") : .secondary).padding(.horizontal, 4)
        }.buttonStyle(.plain)
    }

    private var penOptions: some View {
        HStack(spacing: 12) {
            ForEach(MarkupColor.allPenColors) { c in
                Button { manager.penColor = c } label: {
                    Circle().fill(Color(hex: c.hex)).frame(width: 24, height: 24)
                        .overlay { if manager.penColor == c { Circle().stroke(.white, lineWidth: 2).frame(width: 28, height: 28) } }
                }.buttonStyle(.plain)
            }
            Divider().frame(height: 20)
            ForEach([1.5, 3.0, 5.0], id: \.self) { w in
                Button { manager.penWidth = w } label: {
                    Circle().fill(manager.penWidth == w ? Color(hex: "#FF6B6B") : .secondary).frame(width: w*3+4, height: w*3+4)
                }.buttonStyle(.plain)
            }; Spacer()
        }.padding(.horizontal, 16).padding(.vertical, 6).background(Color(.tertiarySystemGroupedBackground))
    }

    private var highlightOptions: some View {
        HStack(spacing: 12) {
            Text("Color").font(.caption.weight(.medium)).foregroundStyle(.secondary)
            ForEach(MarkupColor.allHighlightColors) { c in
                Button { manager.highlightColor = c } label: {
                    RoundedRectangle(cornerRadius: 4).fill(Color(hex: c.hex).opacity(0.5)).frame(width: 28, height: 18)
                        .overlay { if manager.highlightColor == c { RoundedRectangle(cornerRadius: 4).stroke(Color(hex: c.hex), lineWidth: 2) } }
                }.buttonStyle(.plain)
            }; Spacer()
        }.padding(.horizontal, 16).padding(.vertical, 6).background(Color(.tertiarySystemGroupedBackground))
    }

    private var rowCounter: some View {
        HStack(spacing: 0) {
            Button { if rowCount > 0 { rowCount -= 1 } } label: { Image(systemName: "minus").font(.caption.weight(.bold)).frame(width: 32, height: 36) }.buttonStyle(.plain)
            Button { rowCount += 1; UIImpactFeedbackGenerator(style: .light).impactOccurred() } label: {
                Text("\(rowCount)").font(.system(size: 17, weight: .bold, design: .rounded)).frame(minWidth: 32)
                    .contentTransition(.numericText()).animation(.easeInOut(duration: 0.15), value: rowCount)
            }.buttonStyle(.plain)
            Button { rowCount += 1; UIImpactFeedbackGenerator(style: .light).impactOccurred() } label: { Image(systemName: "plus").font(.caption.weight(.bold)).frame(width: 32, height: 36) }.buttonStyle(.plain)
            Button { rowCount = 0 } label: { Image(systemName: "arrow.counterclockwise").font(.caption2.weight(.semibold)).frame(width: 28, height: 36).foregroundStyle(.secondary) }.buttonStyle(.plain)
        }.foregroundStyle(.white).padding(.horizontal, 4).background(.ultraThinMaterial, in: Capsule()).shadow(color: .black.opacity(0.25), radius: 8, y: 2)
    }
}

// MARK: - Note Editor

struct PDFNoteEditorSheet: View {
    @Binding var text: String; @Binding var colorHex: String
    var onSave: () -> Void; var onDelete: (() -> Void)?
    @Environment(\.dismiss) private var dismiss; @FocusState private var focused: Bool
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(MarkupColor.allNoteColors) { c in
                            Button { colorHex = c.hex } label: {
                                ZStack {
                                    if c.id == "noteClear" { RoundedRectangle(cornerRadius: 6).strokeBorder(style: StrokeStyle(lineWidth: 1.5, dash: [3])).foregroundStyle(.secondary).frame(width: 36, height: 36) }
                                    else { RoundedRectangle(cornerRadius: 6).fill(Color(hex: c.hex)).frame(width: 36, height: 36) }
                                    if colorHex == c.hex { Image(systemName: "checkmark").font(.caption.weight(.bold)).foregroundStyle(.black.opacity(0.4)) }
                                }
                            }.buttonStyle(.plain)
                        }
                    }.padding(.horizontal, 16)
                }.padding(.vertical, 10)
                TextEditor(text: $text).font(.body).padding(8).frame(maxHeight: .infinity)
                    .scrollContentBackground(.hidden).background(colorHex == "#00000000" ? Color(.systemBackground) : Color(hex: colorHex).opacity(0.4)).focused($focused)
                if let onDelete { Button(role: .destructive) { onDelete(); dismiss() } label: { Label("Delete note", systemImage: "trash").font(.subheadline).frame(maxWidth: .infinity).padding(.vertical, 12) }.padding(.horizontal).padding(.bottom, 8) }
            }
            .navigationTitle("Note").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Done") { onSave(); dismiss() } }
            }.onAppear { focused = true }
        }
    }
}

// MARK: - PDF + Drawing Overlay

struct MarkupPDFContainer: UIViewRepresentable {
    let document: PDFDocument
    let manager: PDFAnnotationManager
    @Binding var movingNoteId: String?
    var onNoteTap: ((_ id: String) -> Void)?
    var onNewNote: ((_ screenPoint: CGPoint) -> Void)?
    var onNoteEdit: ((_ id: String, _ text: String, _ color: String) -> Void)?

    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }

    func makeUIView(context: Context) -> UIView {
        let container = UIView()

        let pdfView = PDFView()
        pdfView.autoScales = true
        pdfView.displayMode = .singlePageContinuous
        pdfView.displayDirection = .vertical
        pdfView.document = document
        pdfView.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(pdfView)

        let overlay = DrawingOverlayView()
        overlay.backgroundColor = .clear
        overlay.translatesAutoresizingMaskIntoConstraints = false
        overlay.coordinator = context.coordinator
        container.addSubview(overlay)

        NSLayoutConstraint.activate([
            pdfView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            pdfView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            pdfView.topAnchor.constraint(equalTo: container.topAnchor),
            pdfView.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            overlay.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            overlay.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            overlay.topAnchor.constraint(equalTo: container.topAnchor),
            overlay.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        context.coordinator.pdfView = pdfView
        context.coordinator.overlay = overlay
        manager.onFullRebuild = { [weak c = context.coordinator] in c?.rebuildLayers() }
        manager.onAnnotationAdded = { [weak c = context.coordinator] record in c?.appendLayer(for: record) }
        DispatchQueue.main.async { context.coordinator.rebuildLayers() }

        return container
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        context.coordinator.parent = self
        // Never toggle isUserInteractionEnabled — the overlay's hitTest handles it
    }

    // MARK: - Coordinator

    class Coordinator {
        var parent: MarkupPDFContainer
        weak var pdfView: PDFView?
        weak var overlay: DrawingOverlayView?

        // Live drawing state
        var currentPoints: [CGPoint] = []
        var liveLayer: CAShapeLayer?
        // Note resize state
        private var isResizing = false
        private var resizeStartSize: CGSize = .zero

        init(parent: MarkupPDFContainer) { self.parent = parent }


        var mgr: PDFAnnotationManager { parent.manager }

        // MARK: - Layer Management

        /// Append a single layer (used after addAnnotation — no full strip)
        func appendLayer(for record: AnnotationRecord) {
            guard let overlay else { return }
            let layer = makeLayer(for: record)
            overlay.layer.addSublayer(layer)
            overlay.annotationLayers.append(layer)
        }

        /// Full rebuild — strip all layers and recreate (used for undo/redo/erase/reset)
        func rebuildLayers() {
            guard let overlay else { return }
            // Remove all sublayers except the live drawing layer
            overlay.annotationLayers.forEach { $0.removeFromSuperlayer() }
            overlay.annotationLayers.removeAll()

            for record in mgr.annotations {
                let layer = makeLayer(for: record)
                overlay.layer.addSublayer(layer)
                overlay.annotationLayers.append(layer)
            }
        }

        private func makeLayer(for record: AnnotationRecord) -> CALayer {
            switch record.type {
            case "pen":
                let layer = CAShapeLayer()
                if let pts = record.points, pts.count >= 2 {
                    let path = CGMutablePath()
                    path.move(to: CGPoint(x: pts[0].x, y: pts[0].y))
                    for pt in pts.dropFirst() { path.addLine(to: CGPoint(x: pt.x, y: pt.y)) }
                    layer.path = path
                }
                layer.strokeColor = mgr.uiColor(record.color).cgColor
                layer.fillColor = nil
                layer.lineWidth = record.width ?? 3
                layer.lineCap = .round; layer.lineJoin = .round
                layer.name = record.id
                return layer

            case "highlight":
                let layer = CALayer()
                if let b = record.bounds {
                    layer.frame = CGRect(x: b.x, y: b.y, width: b.width, height: b.height)
                }
                layer.backgroundColor = mgr.uiColor(record.color).withAlphaComponent(0.35).cgColor
                layer.name = record.id
                return layer

            case "text":
                let container = CALayer()
                if let b = record.bounds {
                    container.frame = CGRect(x: b.x, y: b.y, width: b.width, height: b.height)
                }
                let bgColor = mgr.uiColor(record.color)
                container.backgroundColor = bgColor.cgColor.alpha > 0.01 ? bgColor.withAlphaComponent(0.5).cgColor : UIColor.clear.cgColor
                container.borderColor = bgColor.cgColor.alpha > 0.01 ? bgColor.withAlphaComponent(0.8).cgColor : UIColor.gray.withAlphaComponent(0.3).cgColor
                container.borderWidth = 0.5
                container.cornerRadius = 3

                // Text sublayer
                let textLayer = CATextLayer()
                textLayer.frame = container.bounds.insetBy(dx: 4, dy: 3)
                textLayer.string = record.text ?? "Note"
                textLayer.fontSize = 11
                textLayer.foregroundColor = UIColor.darkGray.cgColor
                textLayer.isWrapped = true
                textLayer.truncationMode = .end
                textLayer.contentsScale = UIScreen.main.scale
                textLayer.backgroundColor = UIColor.clear.cgColor
                container.addSublayer(textLayer)

                // Resize handle (small triangle in bottom-right)
                let handleSize: CGFloat = 10
                let handle = CAShapeLayer()
                let path = CGMutablePath()
                let w = container.bounds.width, h = container.bounds.height
                path.move(to: CGPoint(x: w, y: h - handleSize))
                path.addLine(to: CGPoint(x: w - handleSize, y: h))
                path.addLine(to: CGPoint(x: w, y: h))
                path.closeSubpath()
                handle.path = path
                handle.fillColor = UIColor.gray.withAlphaComponent(0.4).cgColor
                container.addSublayer(handle)

                container.name = record.id
                return container

            default:
                let layer = CALayer(); layer.name = record.id; return layer
            }
        }

        // MARK: - Touch Handlers (called by DrawingOverlayView)

        func touchBegan(_ point: CGPoint) {
            // Moving/resizing a note
            if let mid = parent.movingNoteId {
                // Check if touch is near bottom-right corner → resize
                if let rec = mgr.annotations.first(where: { $0.id == mid }),
                   let b = rec.bounds {
                    let cornerX = b.x + b.width
                    let cornerY = b.y + b.height
                    let dist = hypot(point.x - cornerX, point.y - cornerY)
                    if dist < 30 {
                        isResizing = true
                        resizeStartSize = CGSize(width: b.width, height: b.height)
                    } else {
                        isResizing = false
                    }
                }
                return
            }

            if mgr.activeTool == .pen || mgr.activeTool == .highlight {
                currentPoints = [point]
                // Live preview layer
                liveLayer?.removeFromSuperlayer()
                let layer = CAShapeLayer()
                layer.fillColor = nil; layer.lineCap = .round; layer.lineJoin = .round
                if mgr.activeTool == .pen {
                    layer.strokeColor = mgr.uiColor(mgr.penColor.hex).cgColor
                    layer.lineWidth = mgr.penWidth
                } else {
                    layer.strokeColor = mgr.uiColor(mgr.highlightColor.hex).withAlphaComponent(0.35).cgColor
                    layer.lineWidth = 16
                }
                overlay?.layer.addSublayer(layer)
                liveLayer = layer
            }
            if mgr.activeTool == .eraser {
                eraseAt(point)
            }
        }

        func touchMoved(_ point: CGPoint) {
            if let mid = parent.movingNoteId {
                if let rec = mgr.annotations.first(where: { $0.id == mid }),
                   let b = rec.bounds {
                    if isResizing {
                        // Resize: new width/height = distance from note origin to touch point
                        let newW = max(60, Double(point.x) - b.x)
                        let newH = max(20, Double(point.y) - b.y)
                        CATransaction.begin(); CATransaction.setDisableActions(true)
                        if let noteLayer = overlay?.annotationLayers.first(where: { $0.name == mid }) {
                            noteLayer.frame = CGRect(x: b.x, y: b.y, width: newW, height: newH)
                        }
                        CATransaction.commit()
                        mgr.resizeNoteQuietly(id: mid, width: newW, height: newH)
                    } else {
                        // Move
                        let newX = Double(point.x) - b.width/2
                        let newY = Double(point.y) - b.height/2
                        CATransaction.begin(); CATransaction.setDisableActions(true)
                        if let noteLayer = overlay?.annotationLayers.first(where: { $0.name == mid }) {
                            noteLayer.frame = CGRect(x: newX, y: newY, width: b.width, height: b.height)
                        }
                        CATransaction.commit()
                        mgr.moveNoteQuietly(id: mid, x: newX, y: newY)
                    }
                }
                return
            }

            if mgr.activeTool == .pen || mgr.activeTool == .highlight {
                currentPoints.append(point)
                let path = CGMutablePath()
                path.move(to: currentPoints[0])
                for pt in currentPoints.dropFirst() { path.addLine(to: pt) }
                liveLayer?.path = path
            }
            if mgr.activeTool == .eraser {
                eraseAt(point)
            }
        }

        func touchEnded(_ point: CGPoint) {
            if parent.movingNoteId != nil { return }

            liveLayer?.removeFromSuperlayer(); liveLayer = nil

            if mgr.activeTool == .pen && currentPoints.count >= 2 {
                let pts = currentPoints.map { PointData(x: Double($0.x), y: Double($0.y)) }
                let xs = currentPoints.map(\.x), ys = currentPoints.map(\.y)
                mgr.addAnnotation(AnnotationRecord(id: UUID().uuidString, type: "pen", page: 0,
                    bounds: AnnotationBounds(x: Double(xs.min()!), y: Double(ys.min()!),
                        width: Double(xs.max()! - xs.min()!), height: Double(ys.max()! - ys.min()!)),
                    color: mgr.penColor.hex, points: pts, text: nil, width: Double(mgr.penWidth)))
            } else if mgr.activeTool == .highlight && currentPoints.count >= 2 {
                let xs = currentPoints.map(\.x), ys = currentPoints.map(\.y)
                mgr.addAnnotation(AnnotationRecord(id: UUID().uuidString, type: "highlight", page: 0,
                    bounds: AnnotationBounds(x: Double(xs.min()!), y: Double(ys.min()!) - 4,
                        width: Double(xs.max()! - xs.min()!), height: max(Double(ys.max()! - ys.min()!), 16)),
                    color: mgr.highlightColor.hex, points: nil, text: nil, width: nil))
            }
            currentPoints = []
        }

        func tapped(_ point: CGPoint) {
            if parent.movingNoteId != nil {
                parent.movingNoteId = nil; return
            }

            switch mgr.activeTool {
            case .eraser:
                eraseAt(point)
            case .text:
                if let rec = mgr.findRecord(at: point), rec.type == "text" {
                    parent.onNoteTap?(rec.id); return
                }
                parent.onNewNote?(point)
            case .highlight:
                mgr.addAnnotation(AnnotationRecord(id: UUID().uuidString, type: "highlight", page: 0,
                    bounds: AnnotationBounds(x: Double(point.x) - 60, y: Double(point.y) - 8, width: 120, height: 16),
                    color: mgr.highlightColor.hex, points: nil, text: nil, width: nil))
            default: break
            }
        }

        private func eraseAt(_ point: CGPoint) {
            if let rec = mgr.findRecord(at: point) {
                mgr.removeAnnotation(id: rec.id)
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            }
        }
    }
}

// MARK: - Drawing Overlay (handles touches directly)

class DrawingOverlayView: UIView {
    weak var coordinator: MarkupPDFContainer.Coordinator?
    var annotationLayers: [CALayer] = []
    private var didMove = false
    private var startPoint: CGPoint = .zero

    /// Pass touches through to PDFView when no tool is active.
    /// Absorb touches when a tool is active (drawing/erasing/notes).
    /// Disables PDF scroll when tool active so vertical strokes work.
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        guard let c = coordinator else { return nil }
        let toolActive = c.mgr.activeTool != .none || c.parent.movingNoteId != nil
        c.pdfView?.isUserInteractionEnabled = !toolActive
        return toolActive ? self : nil
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first else { return }
        let pt = touch.location(in: self)
        startPoint = pt; didMove = false
        coordinator?.touchBegan(pt)
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first else { return }
        let pt = touch.location(in: self)
        didMove = true
        coordinator?.touchMoved(pt)
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first else { return }
        let pt = touch.location(in: self)
        if didMove {
            coordinator?.touchEnded(pt)
        } else {
            coordinator?.tapped(pt)
        }
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        coordinator?.touchEnded(startPoint)
    }
}
