import Foundation
import UIKit

// MARK: - Annotation Tool

enum AnnotationTool: String, CaseIterable {
    case none, highlight, pen, text, eraser
}

// MARK: - Markup Color

struct MarkupColor: Identifiable, Hashable {
    let id: String; let name: String; let hex: String

    static let coral = MarkupColor(id: "coral", name: "Coral", hex: "#FF6B6B")
    static let dustyRose = MarkupColor(id: "dustyRose", name: "Dusty rose", hex: "#D4808A")
    static let warmBrown = MarkupColor(id: "warmBrown", name: "Brown", hex: "#8B6F5E")
    static let softTeal = MarkupColor(id: "softTeal", name: "Teal", hex: "#4ECDC4")
    static let sage = MarkupColor(id: "sage", name: "Sage", hex: "#87A68F")
    static let black = MarkupColor(id: "black", name: "Black", hex: "#2D2D2D")
    static let allPenColors: [MarkupColor] = [.coral, .dustyRose, .warmBrown, .softTeal, .sage, .black]

    static let highlightYellow = MarkupColor(id: "hlYellow", name: "Yellow", hex: "#FFEB3B")
    static let highlightPink = MarkupColor(id: "hlPink", name: "Pink", hex: "#F48FB1")
    static let highlightGreen = MarkupColor(id: "hlGreen", name: "Green", hex: "#A5D6A7")
    static let highlightBlue = MarkupColor(id: "hlBlue", name: "Blue", hex: "#90CAF9")
    static let highlightOrange = MarkupColor(id: "hlOrange", name: "Orange", hex: "#FFCC80")
    static let allHighlightColors: [MarkupColor] = [.highlightYellow, .highlightPink, .highlightGreen, .highlightBlue, .highlightOrange]

    static let noteYellow = MarkupColor(id: "noteYellow", name: "Yellow", hex: "#FFF9C4")
    static let notePink = MarkupColor(id: "notePink", name: "Pink", hex: "#F8BBD0")
    static let noteBlue = MarkupColor(id: "noteBlue", name: "Blue", hex: "#BBDEFB")
    static let noteGreen = MarkupColor(id: "noteGreen", name: "Green", hex: "#C8E6C9")
    static let noteClear = MarkupColor(id: "noteClear", name: "Clear", hex: "#00000000")
    static let allNoteColors: [MarkupColor] = [.noteYellow, .notePink, .noteBlue, .noteGreen, .noteClear]
}

// MARK: - Serializable Data

struct AnnotationRecord: Codable, Identifiable {
    let id: String
    let type: String // "pen", "highlight", "text"
    let page: Int
    let bounds: AnnotationBounds?
    let color: String
    let points: [PointData]?
    var text: String?
    let width: Double?
}

struct AnnotationBounds: Codable {
    let x: Double; let y: Double; let width: Double; let height: Double
}

struct PointData: Codable {
    let x: Double; let y: Double
}

struct AnnotationsPayload: Codable {
    let annotations: [AnnotationRecord]
}

// MARK: - Manager
// Stores annotation data and renders via screen-space CAShapeLayers (NOT PDFKit annotations).

@Observable
final class PDFAnnotationManager {
    var activeTool: AnnotationTool = .none
    var penColor: MarkupColor = .coral
    var highlightColor: MarkupColor = .highlightYellow
    var noteColor: MarkupColor = .noteYellow
    var penWidth: CGFloat = 3.0
    var isSaving = false
    var error: String?

    // All screen-coordinate points stored per annotation for rendering
    // ObservationIgnored so SwiftUI doesn't re-render mid-touch when these change
    @ObservationIgnored private(set) var annotations: [AnnotationRecord] = []
    @ObservationIgnored private var undoStack: [[AnnotationRecord]] = []
    @ObservationIgnored private var redoStack: [[AnnotationRecord]] = []
    @ObservationIgnored private var saveTimer: Timer?
    // Bump this to update undo/redo button state in the toolbar
    var undoVersion = 0
    let pdfUploadId: String

    /// Called when all layers need full rebuild (undo/redo/reset/erase)
    var onFullRebuild: (() -> Void)?
    /// Called when a single annotation was added (append layer, no full strip)
    var onAnnotationAdded: ((_ record: AnnotationRecord) -> Void)?

    var canUndo: Bool { _ = undoVersion; return !undoStack.isEmpty }
    var canRedo: Bool { _ = undoVersion; return !redoStack.isEmpty }

    init(pdfUploadId: String) { self.pdfUploadId = pdfUploadId }
    deinit { saveTimer?.invalidate() }

    // MARK: - Load / Save

    func load() async {
        do {
            let resp: APIResponse<AnnotationsPayload> = try await APIClient.shared.get("/pdf/\(pdfUploadId)/annotations")
            annotations = resp.data.annotations
        } catch is CancellationError { return }
        catch { annotations = [] }
    }

    func save() async {
        isSaving = true; defer { isSaving = false }
        do {
            struct R: Decodable { let id: String }
            let _: APIResponse<R> = try await APIClient.shared.put("/pdf/\(pdfUploadId)/annotations", body: AnnotationsPayload(annotations: annotations))
        } catch { self.error = error.localizedDescription }
    }

    func saveOnDismiss() async { saveTimer?.invalidate(); saveTimer = nil; await save() }

    // MARK: - Mutations

    func addAnnotation(_ record: AnnotationRecord) {
        pushUndo(); annotations.append(record); onAnnotationAdded?(record); scheduleSave()
    }

    func updateAnnotation(_ record: AnnotationRecord) {
        pushUndo()
        if let i = annotations.firstIndex(where: { $0.id == record.id }) { annotations[i] = record }
        onFullRebuild?(); scheduleSave()
    }

    func removeAnnotation(id: String) {
        pushUndo(); annotations.removeAll { $0.id == id }; onFullRebuild?(); undoVersion += 1; scheduleSave()
    }

    /// Move a note without pushing undo on every frame
    func moveNoteQuietly(id: String, x: Double, y: Double) {
        guard let i = annotations.firstIndex(where: { $0.id == id }),
              let b = annotations[i].bounds else { return }
        annotations[i] = AnnotationRecord(id: id, type: "text", page: 0,
            bounds: AnnotationBounds(x: x, y: y, width: b.width, height: b.height),
            color: annotations[i].color, points: nil, text: annotations[i].text, width: nil)
    }

    /// Resize a note without pushing undo on every frame
    func resizeNoteQuietly(id: String, width: Double, height: Double) {
        guard let i = annotations.firstIndex(where: { $0.id == id }),
              let b = annotations[i].bounds else { return }
        annotations[i] = AnnotationRecord(id: id, type: "text", page: 0,
            bounds: AnnotationBounds(x: b.x, y: b.y, width: width, height: height),
            color: annotations[i].color, points: nil, text: annotations[i].text, width: nil)
    }

    func resetAll() {
        pushUndo(); annotations.removeAll(); onFullRebuild?(); undoVersion += 1; scheduleSave()
    }

    func undo() {
        guard let prev = undoStack.popLast() else { return }
        redoStack.append(annotations); annotations = prev; onFullRebuild?(); undoVersion += 1; scheduleSave()
    }

    func redo() {
        guard let next = redoStack.popLast() else { return }
        undoStack.append(annotations); annotations = next; onFullRebuild?(); undoVersion += 1; scheduleSave()
    }

    // MARK: - Hit Test (screen coordinates)

    func findRecord(at screenPoint: CGPoint) -> AnnotationRecord? {
        let pad: CGFloat = 20
        for record in annotations.reversed() {
            if let b = record.bounds {
                let r = CGRect(x: b.x - pad, y: b.y - pad, width: b.width + pad*2, height: b.height + pad*2)
                if r.contains(screenPoint) { return record }
            }
            if record.type == "pen", let pts = record.points, !pts.isEmpty {
                let xs = pts.map { $0.x }, ys = pts.map { $0.y }
                let r = CGRect(x: (xs.min() ?? 0) - pad, y: (ys.min() ?? 0) - pad,
                    width: ((xs.max() ?? 0) - (xs.min() ?? 0)) + pad*2,
                    height: ((ys.max() ?? 0) - (ys.min() ?? 0)) + pad*2)
                if r.contains(screenPoint) { return record }
            }
        }
        return nil
    }

    // MARK: - Color Helper

    func uiColor(_ hex: String) -> UIColor {
        let c = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var v: UInt64 = 0; Scanner(string: c).scanHexInt64(&v)
        switch c.count {
        case 8: return UIColor(red: Double((v>>24)&0xFF)/255, green: Double((v>>16)&0xFF)/255, blue: Double((v>>8)&0xFF)/255, alpha: Double(v&0xFF)/255)
        case 6: return UIColor(red: Double((v>>16)&0xFF)/255, green: Double((v>>8)&0xFF)/255, blue: Double(v&0xFF)/255, alpha: 1)
        default: return .black
        }
    }

    // MARK: - Private

    private func pushUndo() {
        undoStack.append(annotations); redoStack.removeAll()
        if undoStack.count > 30 { undoStack.removeFirst() }
    }

    private func scheduleSave() {
        saveTimer?.invalidate()
        saveTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: false) { [weak self] _ in
            Task { await self?.save() }
        }
    }
}
