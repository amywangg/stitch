import SwiftUI

struct StashView: View {
    @Environment(ThemeManager.self) private var theme
    @Bindable var viewModel: StashViewModel
    @Binding var ravelryConnected: Bool
    @Binding var showYarnSearch: Bool
    var viewMode: StashViewMode

    // Standalone init with internal state
    init() {
        let vm = StashViewModel()
        self._viewModel = Bindable(vm)
        self._ravelryConnected = .constant(false)
        self._showYarnSearch = .constant(false)
        self.viewMode = .list
    }

    // Parent-managed init
    init(viewModel: StashViewModel, ravelryConnected: Binding<Bool>, showYarnSearch: Binding<Bool>, viewMode: StashViewMode) {
        self._viewModel = Bindable(viewModel)
        self._ravelryConnected = ravelryConnected
        self._showYarnSearch = showYarnSearch
        self.viewMode = viewMode
    }

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.items.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if viewModel.items.isEmpty {
                ContentUnavailableView {
                    Label("No yarn in stash", systemImage: "basket")
                } description: {
                    Text("Search Ravelry's yarn database or sync from your Ravelry account.")
                } actions: {
                    Button {
                        showYarnSearch = true
                    } label: {
                        Label("Search yarn", systemImage: "magnifyingglass")
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(theme.primary)

                    if ravelryConnected {
                        Button {
                            Task { await viewModel.syncRavelry() }
                        } label: {
                            Label("Sync from Ravelry", systemImage: "arrow.triangle.2.circlepath")
                        }
                        .buttonStyle(.bordered)
                    }
                }
            } else {
                ZStack(alignment: .bottom) {
                    switch viewMode {
                    case .list:
                        listLayout
                    case .grid:
                        gridLayout
                    case .large:
                        largeLayout
                    }

                    Button {
                        showYarnSearch = true
                    } label: {
                        Label("Add yarn", systemImage: "plus")
                            .font(.subheadline.weight(.semibold))
                            .padding(.horizontal, 20)
                            .padding(.vertical, 12)
                            .background(theme.primary)
                            .foregroundStyle(.white)
                            .clipShape(Capsule())
                            .shadow(color: theme.primary.opacity(0.3), radius: 8, y: 4)
                    }
                    .padding(.bottom, 16)
                }
            }
        }
        .sheet(isPresented: $showYarnSearch) {
            YarnSearchView {
                Task { await viewModel.load() }
            }
        }
        .task {
            await viewModel.load()
        }
        .onAppear {
            // Refresh when returning from detail view where edits/deletes may have occurred
            if !viewModel.items.isEmpty {
                Task { await viewModel.load() }
            }
        }
        .alert("Error", isPresented: .init(
            get: { viewModel.error != nil },
            set: { if !$0 { viewModel.error = nil } }
        )) {
            Button("OK") { viewModel.error = nil }
        } message: {
            Text(viewModel.error ?? "")
        }
        .alert("Sync complete", isPresented: .init(
            get: { viewModel.syncMessage != nil },
            set: { if !$0 { viewModel.syncMessage = nil } }
        )) {
            Button("OK") { viewModel.syncMessage = nil }
        } message: {
            Text(viewModel.syncMessage ?? "")
        }
    }
}

// MARK: - Layouts

extension StashView {
    private var listLayout: some View {
        List {
            ForEach(viewModel.items) { item in
                NavigationLink(value: Route.stashItemDetail(id: item.id)) {
                    StashRowView(item: item)
                }
            }
            .onDelete { indexSet in
                for index in indexSet {
                    let item = viewModel.items[index]
                    Task { await viewModel.delete(item) }
                }
            }

        }
        .listStyle(.plain)
        .refreshable { await viewModel.load() }
    }

    private var gridLayout: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                ForEach(viewModel.items) { item in
                    NavigationLink(value: Route.stashItemDetail(id: item.id)) {
                        StashGridCell(item: item)
                    }
                    .buttonStyle(.plain)
                    .contextMenu {
                        Button(role: .destructive) {
                            Task { await viewModel.delete(item) }
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
        }
        .refreshable { await viewModel.load() }
    }

    private var largeLayout: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(viewModel.items) { item in
                    NavigationLink(value: Route.stashItemDetail(id: item.id)) {
                        StashLargeCard(item: item)
                    }
                    .buttonStyle(.plain)
                    .contextMenu {
                        Button(role: .destructive) {
                            Task { await viewModel.delete(item) }
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
        }
        .refreshable { await viewModel.load() }
    }
}

// MARK: - Grid Cell

struct StashGridCell: View {
    @Environment(ThemeManager.self) private var theme
    let item: StashItem

    private var displayPhotoUrl: String? {
        if let photo = item.photoUrl, !photo.isEmpty { return photo }
        if let photo = item.yarn?.imageUrl, !photo.isEmpty { return photo }
        return nil
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let imageUrl = displayPhotoUrl,
               let url = URL(string: imageUrl) {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color(.systemGray5)
                }
                .frame(height: 120)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            } else {
                RoundedRectangle(cornerRadius: 10)
                    .fill(theme.primary.opacity(0.1))
                    .frame(height: 120)
                    .overlay {
                        Image(systemName: "wand.and.rays.inverse")
                            .font(.title2)
                            .foregroundStyle(theme.primary.opacity(0.4))
                    }
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(item.yarn?.name ?? "Unknown yarn")
                    .font(.caption.weight(.semibold))
                    .lineLimit(2)
                    .foregroundStyle(.primary)
                if let company = item.yarn?.company?.name {
                    Text(company)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                if let colorway = item.colorway {
                    Text(colorway)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
        }
        .padding(8)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Large Card

struct StashLargeCard: View {
    @Environment(ThemeManager.self) private var theme
    let item: StashItem

    private var displayPhotoUrl: String? {
        if let photo = item.photoUrl, !photo.isEmpty { return photo }
        if let photo = item.yarn?.imageUrl, !photo.isEmpty { return photo }
        return nil
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let imageUrl = displayPhotoUrl,
               let url = URL(string: imageUrl) {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color(.systemGray5)
                }
                .frame(height: 200)
                .frame(maxWidth: .infinity)
                .clipped()
            } else {
                RoundedRectangle(cornerRadius: 0)
                    .fill(theme.primary.opacity(0.08))
                    .frame(height: 200)
                    .overlay {
                        Image(systemName: "wand.and.rays.inverse")
                            .font(.largeTitle)
                            .foregroundStyle(theme.primary.opacity(0.3))
                    }
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(item.yarn?.name ?? "Unknown yarn")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
                if let company = item.yarn?.company?.name {
                    Text(company)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                HStack(spacing: 8) {
                    if let colorway = item.colorway {
                        Text(colorway)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    if let weight = item.yarn?.weight {
                        Text(weight.capitalized)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Text("\(item.skeins, specifier: "%.0f") skein\(item.skeins == 1 ? "" : "s")")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(12)
        }
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

// MARK: - List Row

struct StashRowView: View {
    @Environment(ThemeManager.self) private var theme
    let item: StashItem

    private var displayPhotoUrl: String? {
        if let photo = item.photoUrl, !photo.isEmpty { return photo }
        if let photo = item.yarn?.imageUrl, !photo.isEmpty { return photo }
        return nil
    }

    var body: some View {
        HStack(spacing: 12) {
            if let imageUrl = displayPhotoUrl,
               let url = URL(string: imageUrl) {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color(.systemGray5)
                }
                .frame(width: 44, height: 44)
                .clipShape(RoundedRectangle(cornerRadius: 6))
            } else {
                RoundedRectangle(cornerRadius: 6)
                    .fill(item.colorway != nil ? theme.primary.opacity(0.3) : Color.secondary.opacity(0.15))
                    .frame(width: 44, height: 44)
                    .overlay {
                        Image(systemName: "wand.and.rays.inverse")
                            .font(.system(size: 16))
                            .foregroundStyle(item.colorway != nil ? theme.primary : .secondary)
                    }
            }

            VStack(alignment: .leading, spacing: 3) {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(item.yarn?.name ?? "Unknown yarn")
                        .font(.subheadline.weight(.medium))
                        .lineLimit(1)
                    if item.ravelryId != nil {
                        Text("R")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(theme.primary, in: RoundedRectangle(cornerRadius: 4))
                    }
                }
                if let company = item.yarn?.company?.name {
                    Text(company)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                HStack(spacing: 8) {
                    if let colorway = item.colorway {
                        Text(colorway)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    if let weight = item.yarn?.weight {
                        Text(weight.capitalized)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Text("\(item.skeins, specifier: "%.0f") skein\(item.skeins == 1 ? "" : "s")")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }
}
