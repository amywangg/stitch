import SwiftUI

struct StashView: View {
    @State private var viewModel = StashViewModel()
    @State private var ravelryConnected = false
    @State private var showYarnSearch = false

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
                    .tint(Color(hex: "#FF6B6B"))

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

                    Section {
                        Button {
                            showYarnSearch = true
                        } label: {
                            HStack {
                                Image(systemName: "plus.circle.fill")
                                    .font(.title3)
                                Text("Add yarn")
                                    .font(.subheadline.weight(.medium))
                            }
                            .foregroundStyle(Color(hex: "#FF6B6B"))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 4)
                        }
                        .listRowBackground(Color(hex: "#FF6B6B").opacity(0.06))
                    }
                }
                .listStyle(.plain)
                .refreshable { await viewModel.load() }
            }
        }
        .navigationTitle("Yarn stash")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: 12) {
                    if ravelryConnected {
                        Button {
                            Task { await viewModel.syncRavelry() }
                        } label: {
                            if viewModel.isSyncing {
                                ProgressView().controlSize(.small)
                            } else {
                                Image(systemName: "arrow.triangle.2.circlepath")
                            }
                        }
                        .disabled(viewModel.isSyncing)
                    }

                    Button {
                        showYarnSearch = true
                    } label: {
                        Image(systemName: "plus")
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
            await loadRavelryStatus()
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

    private func loadRavelryStatus() async {
        do {
            struct StatusResponse: Decodable { let connected: Bool }
            let res: APIResponse<StatusResponse> = try await APIClient.shared.get(
                "/integrations/ravelry/status"
            )
            ravelryConnected = res.data.connected
        } catch {}
    }
}

struct StashRowView: View {
    let item: StashItem

    var body: some View {
        HStack(spacing: 12) {
            if let imageUrl = item.yarn?.imageUrl, !imageUrl.isEmpty,
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
                    .fill(item.colorway != nil ? Color(hex: "#4ECDC4").opacity(0.3) : Color.secondary.opacity(0.15))
                    .frame(width: 44, height: 44)
                    .overlay {
                        Image(systemName: "wand.and.rays.inverse")
                            .font(.system(size: 16))
                            .foregroundStyle(item.colorway != nil ? Color(hex: "#4ECDC4") : .secondary)
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
                            .background(Color(hex: "#FF6B6B"), in: RoundedRectangle(cornerRadius: 4))
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
