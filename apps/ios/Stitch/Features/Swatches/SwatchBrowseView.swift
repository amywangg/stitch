import SwiftUI

@Observable
final class SwatchBrowseViewModel {
    var swatches: [Swatch] = []
    var isLoading = false
    var error: String?
    var query = ""
    var selectedCraft: String?
    var page = 1
    var hasMore = true

    func load() async {
        isLoading = true
        defer { isLoading = false }
        page = 1
        do {
            let response: APIResponse<PaginatedData<Swatch>> = try await APIClient.shared.get(buildPath())
            swatches = response.data.items
            hasMore = response.data.hasMore
        } catch {
            self.error = error.localizedDescription
        }
    }

    func loadMore() async {
        guard hasMore, !isLoading else { return }
        page += 1
        do {
            let response: APIResponse<PaginatedData<Swatch>> = try await APIClient.shared.get(buildPath())
            swatches.append(contentsOf: response.data.items)
            hasMore = response.data.hasMore
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func buildPath() -> String {
        var params = ["page=\(page)", "limit=20"]
        if !query.isEmpty {
            params.append("query=\(query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query)")
        }
        if let craft = selectedCraft {
            params.append("craft=\(craft)")
        }
        return "/swatches/browse?\(params.joined(separator: "&"))"
    }
}

struct SwatchBrowseView: View {
    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = SwatchBrowseViewModel()
    @State private var searchText = ""

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
        .navigationTitle("Community swatches")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $searchText, prompt: "Search swatches")
        .onSubmit(of: .search) {
            viewModel.query = searchText
            Task { await viewModel.load() }
        }
        .onChange(of: searchText) { _, newValue in
            if newValue.isEmpty && !viewModel.query.isEmpty {
                viewModel.query = ""
                Task { await viewModel.load() }
            }
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Button {
                        viewModel.selectedCraft = nil
                        Task { await viewModel.load() }
                    } label: {
                        HStack {
                            Text("All crafts")
                            if viewModel.selectedCraft == nil {
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                    Button {
                        viewModel.selectedCraft = "knitting"
                        Task { await viewModel.load() }
                    } label: {
                        HStack {
                            Text("Knitting")
                            if viewModel.selectedCraft == "knitting" {
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                    Button {
                        viewModel.selectedCraft = "crochet"
                        Task { await viewModel.load() }
                    } label: {
                        HStack {
                            Text("Crochet")
                            if viewModel.selectedCraft == "crochet" {
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                } label: {
                    Image(systemName: "line.3.horizontal.decrease.circle")
                        .foregroundStyle(viewModel.selectedCraft != nil ? theme.primary : .secondary)
                }
            }
        }
        .task { await viewModel.load() }
        .refreshable { await viewModel.load() }
        .errorAlert(error: $viewModel.error)
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "globe")
                .font(.system(size: 48))
                .foregroundStyle(.quaternary)

            Text("No swatches yet")
                .font(.title3.weight(.semibold))

            Text("Public swatches from the community will appear here. Be the first to share one!")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
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
                    NavigationLink(value: Route.swatchDetail(id: swatch.id)) {
                        browseCard(swatch)
                    }
                    .buttonStyle(.plain)
                    .onAppear {
                        if swatch.id == viewModel.swatches.last?.id {
                            Task { await viewModel.loadMore() }
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
    }

    private func browseCard(_ swatch: Swatch) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // Photo
            if let url = swatch.photoUrl, let imageUrl = URL(string: url) {
                AsyncImage(url: imageUrl) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color(.systemGray5)
                }
                .frame(height: 160)
                .clipped()
            }

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

                // Author
                if let author = swatch.user {
                    HStack(spacing: 4) {
                        if let avatarUrl = author.avatarUrl, let url = URL(string: avatarUrl) {
                            AsyncImage(url: url) { image in
                                image.resizable().aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Circle().fill(Color(.systemGray5))
                            }
                            .frame(width: 16, height: 16)
                            .clipShape(Circle())
                        }
                        Text("@\(author.username)")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                    .padding(.top, 2)
                }
            }
            .padding(10)
        }
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
