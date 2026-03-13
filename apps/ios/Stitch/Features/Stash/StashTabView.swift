import SwiftUI

enum StashSection: String, CaseIterable {
    case yarn = "Yarn"
    case needlesHooks = "Needles & hooks"
    case supplies = "Supplies"
}

struct StashTabView: View {
    @State private var selectedSection: StashSection = .yarn

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Section", selection: $selectedSection) {
                    ForEach(StashSection.allCases, id: \.self) { section in
                        Text(section.rawValue).tag(section)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.vertical, 8)

                switch selectedSection {
                case .yarn:
                    StashView()
                case .needlesHooks:
                    NeedlesView()
                case .supplies:
                    SuppliesView()
                }
            }
            .navigationTitle("Stash")
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
    }
}
