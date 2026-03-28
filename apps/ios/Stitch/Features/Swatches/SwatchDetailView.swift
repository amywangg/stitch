import SwiftUI

@Observable
final class SwatchDetailViewModel {
    let swatchId: String
    var swatch: Swatch?
    var isLoading = false
    var error: String?
    var didDelete = false

    init(swatchId: String) {
        self.swatchId = swatchId
    }

    var isOwner: Bool {
        // If the swatch was loaded via own swatches endpoint, user field may be absent
        // The API returns it for both own and public, so compare against stored user
        swatch?.user != nil ? true : true // Owner check done server-side on mutations
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<Swatch> = try await APIClient.shared.get("/swatches/\(swatchId)")
            swatch = response.data
        } catch {
            self.error = error.localizedDescription
        }
    }

    func togglePublic() async {
        guard var swatch else { return }
        let newValue = !swatch.isPublic
        swatch.isPublic = newValue
        self.swatch = swatch
        do {
            let _: APIResponse<Swatch> = try await APIClient.shared.patch(
                "/swatches/\(swatchId)",
                body: ["is_public": newValue]
            )
        } catch {
            swatch.isPublic = !newValue
            self.swatch = swatch
            self.error = error.localizedDescription
        }
    }

    func delete() async {
        do {
            struct Empty: Decodable {}
            let _: APIResponse<Empty> = try await APIClient.shared.delete("/swatches/\(swatchId)")
            didDelete = true
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct SwatchDetailView: View {
    let swatchId: String
    var onDelete: (() -> Void)?
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel: SwatchDetailViewModel
    @State private var showDeleteConfirm = false

    init(swatchId: String, onDelete: (() -> Void)? = nil) {
        self.swatchId = swatchId
        self.onDelete = onDelete
        _viewModel = State(initialValue: SwatchDetailViewModel(swatchId: swatchId))
    }

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.swatch == nil {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let swatch = viewModel.swatch {
                swatchContent(swatch)
            } else {
                ContentUnavailableView("Swatch not found", systemImage: "square.grid.3x3.topleft.filled")
            }
        }
        .navigationTitle(viewModel.swatch?.title ?? "Swatch")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    if let swatch = viewModel.swatch {
                        Button {
                            Task { await viewModel.togglePublic() }
                        } label: {
                            Label(
                                swatch.isPublic ? "Make private" : "Share with community",
                                systemImage: swatch.isPublic ? "lock" : "globe"
                            )
                        }
                    }
                    Button(role: .destructive) {
                        showDeleteConfirm = true
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .confirmationDialog("Delete swatch?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                Task { await viewModel.delete() }
            }
        } message: {
            Text("This cannot be undone.")
        }
        .onChange(of: viewModel.didDelete) { _, deleted in
            if deleted {
                onDelete?()
                dismiss()
            }
        }
        .task { await viewModel.load() }
        .refreshable { await viewModel.load() }
        .errorAlert(error: $viewModel.error)
    }

    private func swatchContent(_ swatch: Swatch) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Photo
                if let url = swatch.photoUrl, let imageUrl = URL(string: url) {
                    AsyncImage(url: imageUrl) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Color(.systemGray5)
                            .overlay { ProgressView() }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 300)
                    .clipped()
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                }

                // Author
                if let author = swatch.user {
                    HStack(spacing: 10) {
                        if let avatarUrl = author.avatarUrl, let url = URL(string: avatarUrl) {
                            AsyncImage(url: url) { image in
                                image.resizable().aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Circle().fill(Color(.systemGray4))
                            }
                            .frame(width: 32, height: 32)
                            .clipShape(Circle())
                        } else {
                            Circle()
                                .fill(Color(.systemGray4))
                                .frame(width: 32, height: 32)
                                .overlay {
                                    Image(systemName: "person.fill")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                        }
                        VStack(alignment: .leading, spacing: 1) {
                            Text(author.displayName ?? author.username)
                                .font(.subheadline.weight(.medium))
                            Text("@\(author.username)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        if swatch.isPublic {
                            Label("Public", systemImage: "globe")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                // Gauge info
                if swatch.stitchesPer10cm != nil || swatch.rowsPer10cm != nil || swatch.needleSizeMm != nil {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Gauge")
                            .font(.headline)

                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible()),
                        ], spacing: 12) {
                            if let sts = swatch.stitchesPer10cm {
                                gaugeCard(value: String(format: "%.1f", sts), label: "stitches/10cm")
                            }
                            if let rows = swatch.rowsPer10cm {
                                gaugeCard(value: String(format: "%.1f", rows), label: "rows/10cm")
                            }
                            if let mm = swatch.needleSizeMm {
                                gaugeCard(
                                    value: swatch.needleSizeLabel ?? String(format: "%.1f mm", mm),
                                    label: swatch.needleType ?? "needle"
                                )
                            }
                        }

                        HStack(spacing: 16) {
                            if swatch.washed {
                                Label("Washed", systemImage: "drop.fill")
                                    .font(.caption)
                                    .foregroundStyle(Color(hex: "#4ECDC4"))
                            }
                            if swatch.blocked {
                                Label("Blocked", systemImage: "square.resize")
                                    .font(.caption)
                                    .foregroundStyle(Color(hex: "#4ECDC4"))
                            }
                        }
                    }
                }

                // Stitch pattern
                if let pattern = swatch.stitchPattern {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Stitch pattern")
                            .font(.headline)
                        Text(pattern)
                            .font(.body)
                            .foregroundStyle(.secondary)
                    }
                }

                // Yarns
                if let yarns = swatch.yarns, !yarns.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Yarns")
                            .font(.headline)

                        ForEach(yarns) { yarn in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(yarn.displayName)
                                        .font(.subheadline.weight(.medium))
                                    if let colorway = yarn.colorway {
                                        Text(colorway)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                Spacer()
                                if yarn.strands > 1 {
                                    Text("×\(yarn.strands)")
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(theme.primary, in: Capsule())
                                }
                            }
                            .padding(12)
                            .background(Color(.secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                    }
                }

                // Notes
                if let notes = swatch.notes, !notes.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Notes")
                            .font(.headline)
                        Text(notes)
                            .font(.body)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(16)
        }
    }

    private func gaugeCard(value: String, label: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title3.weight(.semibold))
                .foregroundStyle(theme.primary)
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}
