import SwiftUI

struct GlossaryView: View {
    var initialCategory: String? = nil

    @Environment(ThemeManager.self) private var theme
    @State private var viewModel = GlossaryViewModel()

    var body: some View {
        VStack(spacing: 0) {
            searchBar
            craftFilter
            categoryChips
            termsList
        }
        .navigationTitle("Glossary")
        .navigationBarTitleDisplayMode(.large)
        .task {
            if let initialCategory {
                viewModel.selectedCategory = initialCategory
            }
            await viewModel.load()
        }
        .errorAlert(error: $viewModel.error)
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)
            TextField("Search terms...", text: $viewModel.searchText)
                .textFieldStyle(.plain)
                .autocorrectionDisabled()
            if !viewModel.searchText.isEmpty {
                Button {
                    viewModel.searchText = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(10)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .padding(.horizontal)
        .padding(.top, 8)
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
                        HStack(spacing: 4) {
                            Image(systemName: GlossaryViewModel.categoryIcon(category))
                                .font(.caption2)
                            Text(GlossaryViewModel.categoryLabel(category))
                                .font(.subheadline.weight(.medium))
                        }
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

    // MARK: - Terms List

    @ViewBuilder
    private var termsList: some View {
        if viewModel.isLoading && viewModel.terms.isEmpty {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if viewModel.filteredTerms.isEmpty {
            ContentUnavailableView.search(text: viewModel.searchText)
        } else {
            List(viewModel.filteredTerms) { term in
                NavigationLink(value: Route.glossaryDetail(slug: term.slug)) {
                    GlossaryTermRow(term: term)
                }
            }
            .listStyle(.plain)
        }
    }
}

// MARK: - Term Row

private struct GlossaryTermRow: View {
    let term: GlossaryTerm

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    if let abbrev = term.abbreviation {
                        Text(abbrev)
                            .font(.subheadline.weight(.bold).monospaced())
                            .foregroundStyle(Color(hex: "#FF6B6B"))
                    }
                    Text(term.name)
                        .font(.subheadline.weight(.medium))
                        .lineLimit(1)
                }

                Text(term.definition)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            Spacer(minLength: 0)

            VStack(alignment: .trailing, spacing: 4) {
                Text(term.difficulty.capitalized)
                    .font(.caption2.weight(.medium))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(
                        Color(hex: GlossaryViewModel.difficultyColor(term.difficulty)).opacity(0.15),
                        in: Capsule()
                    )
                    .foregroundStyle(Color(hex: GlossaryViewModel.difficultyColor(term.difficulty)))

                HStack(spacing: 6) {
                    if term.videoUrl != nil {
                        Image(systemName: "play.circle.fill")
                            .font(.caption)
                            .foregroundStyle(Color(hex: "#FF6B6B").opacity(0.7))
                    }
                    if term.craftType != "both" {
                        Image(systemName: term.craftType == "crochet" ? "lasso" : "hand.draw")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }
            }
        }
        .padding(.vertical, 2)
    }
}
