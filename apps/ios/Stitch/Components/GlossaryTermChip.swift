import SwiftUI

/// A compact tappable chip showing a glossary term's abbreviation and name.
/// Tapping opens a GlossaryQuickSheet with the full definition.
struct GlossaryTermChip: View {
    let term: GlossaryTerm
    @State private var showSheet = false

    var body: some View {
        Button {
            showSheet = true
        } label: {
            HStack(spacing: 4) {
                if let abbrev = term.abbreviation {
                    Text(abbrev)
                        .font(.caption2.weight(.bold).monospaced())
                        .foregroundStyle(Color(hex: "#FF6B6B"))
                }
                Text(term.name)
                    .font(.caption2)
                    .foregroundStyle(.primary)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(Color(hex: "#FF6B6B").opacity(0.08))
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $showSheet) {
            GlossaryQuickSheet(term: term)
        }
    }
}
