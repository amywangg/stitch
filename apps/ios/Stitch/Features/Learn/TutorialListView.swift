import SwiftUI

struct TutorialListView: View {
    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = TutorialListViewModel()

    var body: some View {
        VStack(spacing: 0) {
            craftFilter
            categoryChips
            tutorialsList
        }
        .navigationTitle("Tutorials")
        .navigationBarTitleDisplayMode(.large)
        .task { await viewModel.load() }
        .errorAlert(error: $viewModel.error)
    }

    // MARK: - Craft Filter

    private var craftFilter: some View {
        Picker("Craft", selection: .init(
            get: { viewModel.selectedCraft },
            set: { viewModel.setCraft($0) }
        )) {
            Text("All").tag("all")
            Text("Knitting").tag("knitting")
            Text("Crochet").tag("crochet")
        }
        .pickerStyle(.segmented)
        .padding(.horizontal)
        .padding(.top, 10)
    }

    // MARK: - Category Chips

    private var categoryChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(viewModel.categories, id: \.self) { category in
                    let isSelected = viewModel.selectedCategory == category
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            viewModel.setCategory(category)
                        }
                    } label: {
                        Text(TutorialListViewModel.categoryLabel(category))
                            .font(.subheadline.weight(.medium))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 7)
                            .background(
                                isSelected ? theme.primary : Color(.secondarySystemGroupedBackground),
                                in: Capsule()
                            )
                            .foregroundStyle(isSelected ? .white : .primary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
        }
        .padding(.top, 10)
    }

    // MARK: - List

    @ViewBuilder
    private var tutorialsList: some View {
        if viewModel.isLoading && viewModel.tutorials.isEmpty {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if viewModel.filteredTutorials.isEmpty {
            ContentUnavailableView(
                "No tutorials",
                systemImage: "book",
                description: Text("Check back soon for new tutorials.")
            )
        } else {
            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(viewModel.filteredTutorials) { tutorial in
                        NavigationLink(value: Route.tutorialDetail(id: tutorial.id)) {
                            TutorialCard(tutorial: tutorial)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding()
            }
        }
    }
}

// MARK: - Tutorial Card

private struct TutorialCard: View {
    @Environment(ThemeManager.self) private var theme
    let tutorial: Tutorial

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(tutorial.title)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(2)
                Spacer()
                if let count = tutorial.count?.steps {
                    Text("\(count) steps")
                        .font(.caption2.weight(.medium))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color(.systemGray5), in: Capsule())
                        .foregroundStyle(.secondary)
                }
            }

            if let description = tutorial.description {
                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            HStack(spacing: 8) {
                Text(tutorial.difficulty.capitalized)
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(Color(hex: GlossaryViewModel.difficultyColor(tutorial.difficulty)))

                if tutorial.craftType != "both" {
                    HStack(spacing: 2) {
                        Image(systemName: tutorial.craftType == "crochet" ? "lasso" : "hand.draw")
                            .font(.caption2)
                        Text(tutorial.craftType.capitalized)
                            .font(.caption2)
                    }
                    .foregroundStyle(.tertiary)
                }

                Text(TutorialListViewModel.categoryLabel(tutorial.category))
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
