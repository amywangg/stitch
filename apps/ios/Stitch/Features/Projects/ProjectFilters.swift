import SwiftUI

// MARK: - Project Header Bar

struct ProjectHeaderBar: View {
    @Environment(ThemeManager.self) private var theme
    @Binding var layout: ProjectsLayout
    @Binding var sort: ProjectsSort
    let onNewFromPattern: () -> Void
    let onUploadPdf: () -> Void
    let onBuildPattern: () -> Void

    var body: some View {
        HStack(alignment: .center) {
            Text("Projects")
                .font(.largeTitle.bold())

            Spacer()

            HStack(spacing: 16) {
                sortPicker
                layoutPicker

                Menu {
                    Button {
                        onBuildPattern()
                    } label: {
                        Label("Build a pattern", systemImage: "hammer")
                    }
                    Button {
                        onNewFromPattern()
                    } label: {
                        Label("Start from pattern", systemImage: "book")
                    }
                    Button {
                        onUploadPdf()
                    } label: {
                        Label("Upload PDF", systemImage: "doc.badge.plus")
                    }
                } label: {
                    Image(systemName: "plus")
                        .font(.body.weight(.medium))
                }
            }
            .foregroundStyle(theme.primary)
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
        .background(Color(.systemBackground))
    }

    // MARK: - Sort Picker

    private var sortPicker: some View {
        Menu {
            ForEach(ProjectsSort.allCases, id: \.self) { option in
                Button {
                    withAnimation(.easeInOut(duration: 0.25)) { sort = option }
                } label: {
                    Label {
                        Text(option.label)
                    } icon: {
                        if sort == option {
                            Image(systemName: "checkmark")
                        } else {
                            Image(systemName: option.icon)
                        }
                    }
                }
            }
        } label: {
            Image(systemName: "arrow.up.arrow.down")
                .font(.body.weight(.medium))
        }
    }

    // MARK: - Layout Picker

    private var layoutPicker: some View {
        Menu {
            ForEach(ProjectsLayout.allCases, id: \.self) { mode in
                Button {
                    withAnimation(.easeInOut(duration: 0.25)) { layout = mode }
                } label: {
                    Label(mode.label, systemImage: mode.icon)
                }
            }
        } label: {
            Image(systemName: layout.icon)
                .font(.body.weight(.medium))
                .contentTransition(.symbolEffect(.replace))
        }
    }
}
