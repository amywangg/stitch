import SwiftUI

struct ProjectTypePicker: View {
    @Bindable var viewModel: AIPatternBuilderViewModel
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        ScrollView {
            if viewModel.isLoadingConfig {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding(.top, 100)
            } else if let config = viewModel.config {
                VStack(alignment: .leading, spacing: 16) {
                    Text("What would you like to make?")
                        .font(.title3.weight(.semibold))
                        .padding(.horizontal, 20)

                    LazyVGrid(columns: [
                        GridItem(.flexible(), spacing: 12),
                        GridItem(.flexible(), spacing: 12),
                    ], spacing: 12) {
                        ForEach(config.projectTypes) { projectType in
                            projectTypeCard(projectType)
                        }
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.vertical, 16)
            }
        }
    }

    private func projectTypeCard(_ projectType: ProjectTypeConfig) -> some View {
        let isSelected = viewModel.selectedProjectType == projectType.type
        return Button {
            withAnimation(.easeInOut(duration: 0.15)) {
                viewModel.selectedProjectType = projectType.type
            }
        } label: {
            VStack(spacing: 10) {
                Image(systemName: AIPatternBuilderViewModel.iconForProjectType(projectType.type))
                    .font(.system(size: 32))
                    .foregroundStyle(isSelected ? .white : theme.primary)
                    .frame(height: 40)

                Text(projectType.label)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(isSelected ? .white : .primary)

                Text(projectType.description)
                    .font(.caption)
                    .foregroundStyle(isSelected ? .white.opacity(0.8) : .secondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .padding(.horizontal, 12)
            .background(
                isSelected ? AnyShapeStyle(theme.primary) : AnyShapeStyle(Color(.secondarySystemGroupedBackground)),
                in: RoundedRectangle(cornerRadius: 16)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(isSelected ? theme.primary : .clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }
}
