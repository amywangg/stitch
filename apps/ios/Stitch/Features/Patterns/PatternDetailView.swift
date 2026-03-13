import SwiftUI

// MARK: - ViewModel

@Observable
final class PatternDetailViewModel {
    var pattern: Pattern?
    var isLoading = false
    var error: String?
    var isDeleting = false
    var didDelete = false

    func load(patternId: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<Pattern> = try await APIClient.shared.get("/patterns/\(patternId)")
            pattern = response.data
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deletePattern() async {
        guard let pattern else { return }
        isDeleting = true
        defer { isDeleting = false }
        do {
            struct Empty: Decodable {}
            let _: Empty = try await APIClient.shared.delete("/patterns/\(pattern.id)")
            didDelete = true
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - View

struct PatternDetailView: View {
    let patternId: String
    @State private var viewModel = PatternDetailViewModel()
    @State private var showDeleteConfirmation = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let pattern = viewModel.pattern {
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        // Cover image
                        if let coverUrl = pattern.coverImageUrl, let url = URL(string: coverUrl) {
                            AsyncImage(url: url) { image in
                                image.resizable().aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Color.secondary.opacity(0.15)
                            }
                            .frame(height: 300)
                            .frame(maxWidth: .infinity)
                            .clipped()
                        }

                        VStack(alignment: .leading, spacing: 16) {
                            // Title + designer
                            VStack(alignment: .leading, spacing: 4) {
                                Text(pattern.title)
                                    .font(.title2.weight(.bold))

                                if let designer = pattern.designerName {
                                    Text("by \(designer)")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                }
                            }

                            // Metadata chips
                            FlowLayout(spacing: 8) {
                                if let craft = pattern.craftType.nilIfEmpty {
                                    MetadataChip(label: craft.capitalized, icon: "hand.draw")
                                }
                                if let difficulty = pattern.difficulty {
                                    MetadataChip(label: difficulty.capitalized, icon: "chart.bar")
                                }
                                if let garment = pattern.garmentType {
                                    MetadataChip(label: garment.capitalized, icon: "tshirt")
                                }
                                if pattern.aiParsed {
                                    MetadataChip(label: "AI parsed", icon: "sparkles")
                                }
                            }

                            // Description
                            if let description = pattern.description, !description.isEmpty {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Description")
                                        .font(.headline)
                                    Text(description)
                                        .font(.body)
                                        .foregroundStyle(.secondary)
                                }
                            }

                            // Source link
                            if let sourceUrl = pattern.sourceUrl, let url = URL(string: sourceUrl) {
                                Link(destination: url) {
                                    HStack {
                                        Image(systemName: "link")
                                        Text("View on Ravelry")
                                        Spacer()
                                        Image(systemName: "arrow.up.right")
                                    }
                                    .font(.subheadline)
                                    .padding(12)
                                    .background(Color.secondary.opacity(0.1), in: RoundedRectangle(cornerRadius: 10))
                                }
                            }
                        }
                        .padding()
                    }
                }
            } else {
                ContentUnavailableView("Pattern not found", systemImage: "book.closed")
            }
        }
        .navigationTitle(viewModel.pattern?.title ?? "Pattern")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    if let sourceUrl = viewModel.pattern?.sourceUrl, let url = URL(string: sourceUrl) {
                        ShareLink(item: url) {
                            Label("Share", systemImage: "square.and.arrow.up")
                        }
                    }
                    Button(role: .destructive) {
                        showDeleteConfirmation = true
                    } label: {
                        Label("Delete pattern", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .alert("Delete pattern?", isPresented: $showDeleteConfirmation) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                Task { await viewModel.deletePattern() }
            }
        } message: {
            Text("This pattern will be removed from your library.")
        }
        .alert("Error", isPresented: .init(
            get: { viewModel.error != nil },
            set: { if !$0 { viewModel.error = nil } }
        )) {
            Button("OK") { viewModel.error = nil }
        } message: {
            Text(viewModel.error ?? "")
        }
        .task { await viewModel.load(patternId: patternId) }
        .onChange(of: viewModel.didDelete) { _, deleted in
            if deleted { dismiss() }
        }
    }
}

// MARK: - Supporting Views

private struct MetadataChip: View {
    let label: String
    let icon: String

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption2)
            Text(label)
                .font(.caption)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color.secondary.opacity(0.1), in: Capsule())
    }
}

// FlowLayout is defined in ProfileView.swift (shared)

private extension String {
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}
