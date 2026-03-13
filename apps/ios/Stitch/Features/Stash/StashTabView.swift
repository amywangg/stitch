import SwiftUI

enum StashSection: String, CaseIterable {
    case yarn = "Yarn"
    case needlesHooks = "Needles & hooks"
    case supplies = "Supplies"
}

enum StashViewMode: String, CaseIterable {
    case list
    case grid
    case large

    var icon: String {
        switch self {
        case .list: return "list.bullet"
        case .grid: return "square.grid.2x2"
        case .large: return "rectangle.grid.1x2"
        }
    }

    /// Next mode in rotation
    var next: StashViewMode {
        switch self {
        case .list: return .grid
        case .grid: return .large
        case .large: return .list
        }
    }
}

enum StashSortOption: String, CaseIterable, Identifiable {
    case name = "Name"
    case dateAdded = "Date added"
    case brand = "Brand"
    case weight = "Weight"

    var id: String { rawValue }
}

struct StashTabView: View {
    @Environment(ThemeManager.self) private var theme
    @State private var selectedSection: StashSection = .yarn
    @State private var viewMode: StashViewMode = .list
    @State private var sortOption: StashSortOption = .dateAdded
    @State private var sortAscending = false
    @State private var showFilterSheet = false

    // Yarn state
    @State private var stashViewModel = StashViewModel()
    @State private var ravelryConnected = false
    @State private var showYarnSearch = false

    // Needles state
    @State private var needlesViewModel = NeedlesViewModel()
    @State private var showAddManualNeedle = false
    @State private var navigateToNeedleCatalog = false

    // Supplies state
    @State private var suppliesViewModel = SuppliesViewModel()
    @State private var showAddSupply = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                sectionPicker

                switch selectedSection {
                case .yarn:
                    StashView(viewModel: stashViewModel, ravelryConnected: $ravelryConnected, showYarnSearch: $showYarnSearch, viewMode: viewMode)
                case .needlesHooks:
                    NeedlesView(viewModel: needlesViewModel, ravelryConnected: $ravelryConnected, showAddManual: $showAddManualNeedle, navigateToCatalog: $navigateToNeedleCatalog, viewMode: viewMode)
                case .supplies:
                    SuppliesView(viewModel: suppliesViewModel, showAddSheet: $showAddSupply, viewMode: viewMode)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar(.hidden, for: .navigationBar)
            .safeAreaInset(edge: .top) { stashHeader }
            .navigationDestination(for: Route.self) { route in
                switch route {
                case .addFromCatalog:
                    AddFromCatalogView()
                case .toolSetDetail(let id):
                    ToolSetDetailView(setId: id)
                case .stashItemDetail(let id):
                    StashItemDetailView(itemId: id)
                default:
                    EmptyView()
                }
            }
        }
        .task { await loadRavelryStatus() }
    }

    // MARK: - Header

    private var stashHeader: some View {
        HStack(alignment: .center) {
            Text("Stash")
                .font(.largeTitle.bold())
            Spacer()
            headerTrailingButtons
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 4)
        .background(Color(.systemBackground))
    }

    @ViewBuilder
    private var headerTrailingButtons: some View {
        HStack(spacing: 16) {
            // View mode toggle
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    viewMode = viewMode.next
                }
            } label: {
                Image(systemName: viewMode.icon)
                    .font(.body.weight(.medium))
            }
            .foregroundStyle(theme.primary)

            // Sort menu
            Menu {
                ForEach(StashSortOption.allCases) { option in
                    Button {
                        if sortOption == option {
                            sortAscending.toggle()
                        } else {
                            sortOption = option
                            sortAscending = true
                        }
                    } label: {
                        HStack {
                            Text(option.rawValue)
                            if sortOption == option {
                                Image(systemName: sortAscending ? "chevron.up" : "chevron.down")
                            }
                        }
                    }
                }
            } label: {
                Image(systemName: "arrow.up.arrow.down")
                    .font(.body.weight(.medium))
                    .foregroundStyle(.secondary)
            }

            // Add button (section-specific)
            addButton
        }
    }

    @ViewBuilder
    private var addButton: some View {
        switch selectedSection {
        case .yarn:
            Button {
                showYarnSearch = true
            } label: {
                Image(systemName: "plus")
                    .font(.body.weight(.medium))
            }
            .foregroundStyle(theme.primary)

        case .needlesHooks:
            Menu {
                Button {
                    navigateToNeedleCatalog = true
                } label: {
                    Label("Add a set", systemImage: "rectangle.stack.badge.plus")
                }
                Button {
                    showAddManualNeedle = true
                } label: {
                    Label("Add individual", systemImage: "plus")
                }
            } label: {
                Image(systemName: "plus")
                    .font(.body.weight(.medium))
            }
            .foregroundStyle(theme.primary)

        case .supplies:
            Button {
                showAddSupply = true
            } label: {
                Image(systemName: "plus")
                    .font(.body.weight(.medium))
            }
            .foregroundStyle(theme.primary)
        }
    }

    private func loadRavelryStatus() async {
        do {
            struct StatusResponse: Decodable { let connected: Bool }
            let res: APIResponse<StatusResponse> = try await APIClient.shared.get(
                "/integrations/ravelry/status"
            )
            ravelryConnected = res.data.connected
        } catch {}
    }

    // MARK: - Section Picker

    private var sectionPicker: some View {
        HStack(spacing: 0) {
            ForEach(StashSection.allCases, id: \.self) { section in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { selectedSection = section }
                } label: {
                    VStack(spacing: 6) {
                        Text(section.rawValue)
                            .font(.subheadline.weight(selectedSection == section ? .semibold : .regular))
                            .foregroundStyle(selectedSection == section ? .primary : .secondary)
                        Rectangle()
                            .fill(selectedSection == section ? theme.primary : .clear)
                            .frame(height: 2)
                    }
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, 16)
        .background(Color(.systemBackground))
    }
}
