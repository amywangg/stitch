import SwiftUI

struct SwatchesView: View {
    @Bindable var viewModel: SwatchesViewModel
    @Binding var showCreate: Bool
    @Binding var navigationPath: NavigationPath
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.swatches.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if viewModel.swatches.isEmpty {
                emptyState
            } else {
                swatchGrid
            }
        }
        .task { await viewModel.load() }
        .refreshable { await viewModel.load() }
        .sheet(isPresented: $showCreate) {
            SwatchCreateView {
                Task { await viewModel.load() }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "square.grid.3x3.topleft.filled")
                .font(.system(size: 48))
                .foregroundStyle(.quaternary)

            Text("No swatches yet")
                .font(.title3.weight(.semibold))
                .foregroundStyle(.primary)

            Text("Create a swatch to track your gauge and yarn combinations. Share them with the community for inspiration.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Button {
                showCreate = true
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "plus")
                    Text("New swatch")
                }
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.white)
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(theme.primary, in: Capsule())
            }
            .buttonStyle(.plain)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var swatchGrid: some View {
        ScrollView {
            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 12),
                GridItem(.flexible(), spacing: 12),
            ], spacing: 12) {
                ForEach(viewModel.swatches) { swatch in
                    Button {
                        navigationPath.append(Route.swatchDetail(id: swatch.id))
                    } label: {
                        swatchCard(swatch)
                    }
                    .buttonStyle(.plain)
                    .contextMenu {
                        if swatch.isPublic {
                            Label("Public", systemImage: "globe")
                        } else {
                            Label("Private", systemImage: "lock")
                        }
                        Button(role: .destructive) {
                            Task { await viewModel.delete(swatch.id) }
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
    }

    private func swatchCard(_ swatch: Swatch) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // Photo
            if let url = swatch.photoUrl, let imageUrl = URL(string: url) {
                AsyncImage(url: imageUrl) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color(.systemGray5)
                }
                .frame(height: 140)
                .clipped()
            } else {
                RoundedRectangle(cornerRadius: 0)
                    .fill(Color(.systemGray5))
                    .frame(height: 140)
                    .overlay {
                        Image(systemName: "square.grid.3x3.topleft.filled")
                            .font(.title2)
                            .foregroundStyle(.tertiary)
                    }
            }

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(swatch.title)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)

                if let pattern = swatch.stitchPattern {
                    Text(pattern)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                if let yarns = swatch.yarns, !yarns.isEmpty {
                    Text(yarns.map(\.displayName).joined(separator: " + "))
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                        .lineLimit(1)
                }

                if swatch.stitchesPer10cm != nil || swatch.rowsPer10cm != nil {
                    HStack(spacing: 6) {
                        if let sts = swatch.stitchesPer10cm {
                            Text("\(String(format: "%.0f", sts)) sts")
                                .font(.caption2.weight(.medium))
                        }
                        if let rows = swatch.rowsPer10cm {
                            Text("\(String(format: "%.0f", rows)) rows")
                                .font(.caption2.weight(.medium))
                        }
                    }
                    .foregroundStyle(theme.primary)
                }
            }
            .padding(10)
        }
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(alignment: .topTrailing) {
            if swatch.isPublic {
                Image(systemName: "globe")
                    .font(.caption2)
                    .foregroundStyle(.white)
                    .padding(5)
                    .background(.ultraThinMaterial, in: Circle())
                    .padding(6)
            }
        }
    }
}
