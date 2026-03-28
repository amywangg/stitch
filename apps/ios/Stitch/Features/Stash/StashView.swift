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
        VStack(spacing: 0) {
            statusFilterPicker

            Group {
                if viewModel.isLoading && viewModel.items.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.items.isEmpty {
                    emptyState
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
        }
        .sheet(isPresented: $showYarnSearch) {
            YarnSearchView {
                Task { await viewModel.load() }
            }
        }
        .task {
            await viewModel.load()
        }
        .onChange(of: viewModel.statusFilter) { _, _ in
            Task { await viewModel.load() }
        }
        .onAppear {
            // Refresh when returning from detail view where edits/deletes may have occurred
            if !viewModel.items.isEmpty {
                Task { await viewModel.load() }
            }
        }
        .errorAlert(error: $viewModel.error)
        .alert("Sync complete", isPresented: .init(
            get: { viewModel.syncMessage != nil },
            set: { if !$0 { viewModel.syncMessage = nil } }
        )) {
            Button("OK") { viewModel.syncMessage = nil }
        } message: {
            Text(viewModel.syncMessage ?? "")
        }
    }

    // MARK: - Filter Picker

    private var statusFilterPicker: some View {
        Picker("Filter", selection: $viewModel.statusFilter) {
            ForEach(StashStatusFilter.allCases) { filter in
                Text(filter.label).tag(filter)
            }
        }
        .pickerStyle(.segmented)
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        ContentUnavailableView {
            Label(emptyTitle, systemImage: emptyIcon)
        } description: {
            Text(emptyDescription)
        } actions: {
            if viewModel.statusFilter == .usedUp {
                Button {
                    viewModel.statusFilter = .inStash
                } label: {
                    Text("View stash")
                }
                .buttonStyle(.bordered)
            } else {
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
        }
    }

    private var emptyTitle: String {
        switch viewModel.statusFilter {
        case .inStash: return "No yarn in stash"
        case .usedUp: return "No used up yarn"
        case .all: return "No yarn"
        }
    }

    private var emptyIcon: String {
        switch viewModel.statusFilter {
        case .inStash: return "basket"
        case .usedUp: return "checkmark.circle"
        case .all: return "basket"
        }
    }

    private var emptyDescription: String {
        switch viewModel.statusFilter {
        case .inStash: return "Search for yarn to add to your stash."
        case .usedUp: return "Yarn you've used up will appear here."
        case .all: return "Search for yarn to add to your stash."
        }
    }
}

// MARK: - Layouts

extension StashView {
    private var listLayout: some View {
        List {
            ForEach(viewModel.items) { item in
                NavigationLink(value: Route.stashItemDetail(id: item.id)) {
                    StashRowView(item: item, showStatus: viewModel.statusFilter == .all)
                }
                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                    Button(role: .destructive) {
                        Task { await viewModel.delete(item) }
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                }
                .swipeActions(edge: .leading, allowsFullSwipe: true) {
                    if item.status == nil || item.status == "in_stash" {
                        Button {
                            Task { await viewModel.updateStatus(item, to: "used_up") }
                        } label: {
                            Label("Used up", systemImage: "checkmark.circle")
                        }
                        .tint(.green)
                    } else if item.status == "used_up" {
                        Button {
                            Task { await viewModel.updateStatus(item, to: "in_stash") }
                        } label: {
                            Label("Restore", systemImage: "arrow.uturn.backward")
                        }
                        .tint(.blue)
                    }
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
                        StashGridCell(item: item, showStatus: viewModel.statusFilter == .all)
                    }
                    .buttonStyle(.plain)
                    .contextMenu {
                        statusContextMenu(for: item)
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
                        StashLargeCard(item: item, showStatus: viewModel.statusFilter == .all)
                    }
                    .buttonStyle(.plain)
                    .contextMenu {
                        statusContextMenu(for: item)
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

    @ViewBuilder
    private func statusContextMenu(for item: StashItem) -> some View {
        let currentStatus = item.status ?? "in_stash"
        if currentStatus == "in_stash" {
            Button {
                Task { await viewModel.updateStatus(item, to: "used_up") }
            } label: {
                Label("Mark as used up", systemImage: "checkmark.circle")
            }
            Button {
                Task { await viewModel.updateStatus(item, to: "gifted") }
            } label: {
                Label("Mark as gifted", systemImage: "gift")
            }
        } else {
            Button {
                Task { await viewModel.updateStatus(item, to: "in_stash") }
            } label: {
                Label("Move back to stash", systemImage: "arrow.uturn.backward")
            }
        }
    }
}

// MARK: - Grid Cell

struct StashGridCell: View {
    @Environment(ThemeManager.self) private var theme
    let item: StashItem
    var showStatus: Bool = false

    private var isUsedUp: Bool { item.status == "used_up" || item.status == "gifted" }

    private var displayPhotoUrl: String? {
        if let photo = item.photoUrl, !photo.isEmpty { return photo }
        if let photo = item.yarn?.imageUrl, !photo.isEmpty { return photo }
        return nil
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack(alignment: .topTrailing) {
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

                if showStatus {
                    statusBadge
                        .padding(6)
                }
            }
            .opacity(isUsedUp ? 0.6 : 1.0)

            VStack(alignment: .leading, spacing: 2) {
                Text(item.yarn?.name ?? "Unknown yarn")
                    .font(.caption.weight(.semibold))
                    .lineLimit(2)
                    .foregroundStyle(isUsedUp ? .secondary : .primary)
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

    @ViewBuilder
    private var statusBadge: some View {
        let s = item.status ?? "in_stash"
        switch s {
        case "used_up":
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 16))
                .foregroundStyle(.green)
                .background(Circle().fill(.white).padding(-1))
        case "gifted":
            Image(systemName: "gift.fill")
                .font(.system(size: 14))
                .foregroundStyle(.purple)
                .background(Circle().fill(.white).padding(-1))
        case "for_sale":
            Image(systemName: "tag.fill")
                .font(.system(size: 14))
                .foregroundStyle(.orange)
                .background(Circle().fill(.white).padding(-1))
        default:
            EmptyView()
        }
    }
}

// MARK: - Large Card

struct StashLargeCard: View {
    @Environment(ThemeManager.self) private var theme
    let item: StashItem
    var showStatus: Bool = false

    private var isUsedUp: Bool { item.status == "used_up" || item.status == "gifted" }

    private var displayPhotoUrl: String? {
        if let photo = item.photoUrl, !photo.isEmpty { return photo }
        if let photo = item.yarn?.imageUrl, !photo.isEmpty { return photo }
        return nil
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .topTrailing) {
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

                if showStatus {
                    statusPill
                        .padding(10)
                }
            }
            .opacity(isUsedUp ? 0.6 : 1.0)

            VStack(alignment: .leading, spacing: 4) {
                Text(item.yarn?.name ?? "Unknown yarn")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(isUsedUp ? .secondary : .primary)
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

    @ViewBuilder
    private var statusPill: some View {
        let s = item.status ?? "in_stash"
        if s != "in_stash" {
            Text(statusLabel(s))
                .font(.caption2.weight(.semibold))
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(statusColor(s).opacity(0.9))
                .foregroundStyle(.white)
                .clipShape(Capsule())
        }
    }

    private func statusLabel(_ s: String) -> String {
        switch s {
        case "used_up": return "Used up"
        case "gifted": return "Gifted"
        case "for_sale": return "For sale"
        default: return s.capitalized
        }
    }

    private func statusColor(_ s: String) -> Color {
        switch s {
        case "used_up": return .green
        case "gifted": return .purple
        case "for_sale": return .orange
        default: return .secondary
        }
    }
}

// MARK: - List Row

struct StashRowView: View {
    @Environment(ThemeManager.self) private var theme
    let item: StashItem
    var showStatus: Bool = false

    private var isUsedUp: Bool { item.status == "used_up" || item.status == "gifted" }

    private var displayPhotoUrl: String? {
        if let photo = item.photoUrl, !photo.isEmpty { return photo }
        if let photo = item.yarn?.imageUrl, !photo.isEmpty { return photo }
        return nil
    }

    var body: some View {
        HStack(spacing: 12) {
            ZStack(alignment: .bottomTrailing) {
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

                if showStatus && isUsedUp {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(.green)
                        .background(Circle().fill(.white).padding(-1))
                        .offset(x: 3, y: 3)
                }
            }
            .opacity(isUsedUp ? 0.6 : 1.0)

            VStack(alignment: .leading, spacing: 3) {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(item.yarn?.name ?? "Unknown yarn")
                        .font(.subheadline.weight(.medium))
                        .lineLimit(1)
                        .foregroundStyle(isUsedUp ? .secondary : .primary)
                    if item.ravelryId != nil {
                        Text("R")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(theme.primary, in: RoundedRectangle(cornerRadius: 4))
                    }
                    if showStatus, let s = item.status, s != "in_stash" {
                        Text(statusLabel(s))
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(statusColor(s), in: RoundedRectangle(cornerRadius: 4))
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

    private func statusLabel(_ s: String) -> String {
        switch s {
        case "used_up": return "Used up"
        case "gifted": return "Gifted"
        case "for_sale": return "For sale"
        default: return s.capitalized
        }
    }

    private func statusColor(_ s: String) -> Color {
        switch s {
        case "used_up": return .green
        case "gifted": return .purple
        case "for_sale": return .orange
        default: return .secondary
        }
    }
}
