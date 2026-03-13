import SwiftUI
import PhotosUI

struct StashItemDetailView: View {
    let itemId: String
    @State private var viewModel = StashItemDetailViewModel()
    @State private var showDeleteConfirmation = false
    @State private var showPhotoOptions = false
    @State private var showCamera = false
    @State private var selectedPhotoItem: PhotosPickerItem?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.item == nil {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let item = viewModel.item {
                scrollContent(item: item)
            } else {
                ContentUnavailableView(
                    "Item not found",
                    systemImage: "exclamationmark.triangle",
                    description: Text("This stash item could not be loaded.")
                )
            }
        }
        .navigationTitle(viewModel.item?.yarn?.name ?? "Stash item")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.load(id: itemId) }
        .onChange(of: viewModel.didDelete) { _, deleted in
            if deleted { dismiss() }
        }
        .onChange(of: selectedPhotoItem) { _, newItem in
            guard let newItem else { return }
            Task { await handlePhotoPick(newItem) }
        }
        .alert("Error", isPresented: .init(
            get: { viewModel.error != nil && !viewModel.showUpgradePrompt },
            set: { if !$0 { viewModel.error = nil } }
        )) {
            Button("OK") { viewModel.error = nil }
        } message: {
            Text(viewModel.error ?? "")
        }
        .confirmationDialog(
            "Delete this stash item?",
            isPresented: $showDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                Task { await viewModel.delete() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This action cannot be undone.")
        }
        .alert("Upgrade to Pro", isPresented: $viewModel.showUpgradePrompt) {
            Button("OK", role: .cancel) { viewModel.error = nil }
        } message: {
            Text(viewModel.error ?? "Unlock unlimited features with Stitch Pro.")
        }
        .confirmationDialog("Add a photo", isPresented: $showPhotoOptions) {
            Button("Take photo") { showCamera = true }
            Button("Choose from library") {} // PhotosPicker handles this
            Button("Cancel", role: .cancel) {}
        }
        .fullScreenCover(isPresented: $showCamera) {
            CameraView { imageData in
                Task { await viewModel.uploadPhoto(imageData: imageData) }
            }
        }
    }

    private func handlePhotoPick(_ item: PhotosPickerItem) async {
        guard let data = try? await item.loadTransferable(type: Data.self) else { return }
        // Compress to JPEG
        guard let uiImage = UIImage(data: data),
              let jpegData = uiImage.jpegData(compressionQuality: 0.8) else { return }
        await viewModel.uploadPhoto(imageData: jpegData)
        selectedPhotoItem = nil
    }

    // MARK: - Scroll Content

    private func scrollContent(item: StashItem) -> some View {
        ScrollView {
            VStack(spacing: 24) {
                photoSection(item: item)
                yarnHeaderSection(item: item)
                colorwaySuggestionBanner
                yarnSpecsSection(item: item)
                myStashSection
                projectsSection(item: item)
                dangerZoneSection
            }
            .padding(.bottom, 32)
        }
    }

    // MARK: - Photo Section

    private func photoSection(item: StashItem) -> some View {
        VStack(spacing: 12) {
            if let photoUrl = item.photoUrl, !photoUrl.isEmpty,
               let url = URL(string: photoUrl) {
                // User's photo
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .frame(height: 250)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 250)
                .clipped()

                HStack(spacing: 16) {
                    PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                        Label("Change photo", systemImage: "photo")
                            .font(.subheadline)
                    }

                    if item.colorway == nil || item.colorway?.isEmpty == true {
                        aiColorwayButton
                    }
                }
            } else {
                // No photo — upload prompt
                photoPlaceholder
            }

            if viewModel.isUploadingPhoto {
                HStack(spacing: 8) {
                    ProgressView().controlSize(.small)
                    Text("Uploading...")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private var photoPlaceholder: some View {
        VStack(spacing: 16) {
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemGray6))
                .frame(height: 180)
                .overlay {
                    VStack(spacing: 12) {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(Color(hex: "#FF6B6B").opacity(0.6))

                        Text("Add a photo of your yarn")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.horizontal)

            HStack(spacing: 16) {
                PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                    Label("Choose photo", systemImage: "photo")
                        .font(.subheadline)
                }

                Button {
                    showCamera = true
                } label: {
                    Label("Take photo", systemImage: "camera")
                        .font(.subheadline)
                }
            }
        }
    }

    // MARK: - AI Colorway

    @ViewBuilder
    private var aiColorwayButton: some View {
        Button {
            Task { await viewModel.identifyColorway() }
        } label: {
            if viewModel.isIdentifyingColorway {
                HStack(spacing: 6) {
                    ProgressView().controlSize(.small)
                    Text("Identifying...")
                        .font(.subheadline)
                }
            } else {
                Label("Identify colorway", systemImage: "sparkles")
                    .font(.subheadline)
                    .foregroundStyle(Color(hex: "#FF6B6B"))
            }
        }
        .disabled(viewModel.isIdentifyingColorway)
    }

    @ViewBuilder
    private var colorwaySuggestionBanner: some View {
        if let suggestion = viewModel.colorwaySuggestion {
            VStack(spacing: 8) {
                HStack {
                    Image(systemName: "sparkles")
                        .foregroundStyle(Color(hex: "#FF6B6B"))
                    VStack(alignment: .leading, spacing: 2) {
                        Text("AI suggests: \(suggestion.colorway)")
                            .font(.subheadline.weight(.medium))
                        if let notes = suggestion.notes, !notes.isEmpty {
                            Text(notes)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Text("Confidence: \(suggestion.confidence)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                }

                HStack(spacing: 12) {
                    Button {
                        viewModel.acceptColorwaySuggestion()
                    } label: {
                        Text("Use this")
                            .font(.subheadline.weight(.medium))
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color(hex: "#FF6B6B"))

                    Button {
                        viewModel.colorwaySuggestion = nil
                    } label: {
                        Text("Dismiss")
                            .font(.subheadline)
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
            }
            .padding()
            .background(Color(hex: "#FF6B6B").opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .padding(.horizontal)
        }
    }

    // MARK: - Yarn Header

    private func yarnHeaderSection(item: StashItem) -> some View {
        VStack(spacing: 4) {
            Text(item.yarn?.name ?? "Unknown yarn")
                .font(.title2.weight(.semibold))
                .multilineTextAlignment(.center)

            if let company = item.yarn?.company?.name {
                Text(company)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            if let weight = item.yarn?.weight {
                Text(weight.capitalized)
                    .font(.caption.weight(.medium))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color(hex: "#4ECDC4").opacity(0.15))
                    .foregroundStyle(Color(hex: "#4ECDC4"))
                    .clipShape(Capsule())
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Yarn Specs

    private func yarnSpecsSection(item: StashItem) -> some View {
        let specs = buildSpecs(item: item)
        return Group {
            if !specs.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Yarn specs")
                        .font(.headline)
                        .padding(.horizontal)

                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible()),
                    ], spacing: 12) {
                        ForEach(specs, id: \.label) { spec in
                            specCard(label: spec.label, value: spec.value)
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
    }

    private func buildSpecs(item: StashItem) -> [(label: String, value: String)] {
        var specs: [(label: String, value: String)] = []
        if let grams = item.yarn?.gramsPerSkein {
            specs.append(("Grams/skein", "\(grams) g"))
        }
        if let yardage = item.yarn?.yardagePerSkein {
            specs.append(("Yardage/skein", "\(yardage) yd"))
        }
        if let fiber = item.yarn?.fiberContent, !fiber.isEmpty {
            specs.append(("Fiber content", fiber))
        }
        return specs
    }

    private func specCard(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.subheadline.weight(.medium))
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - My Stash (editable)

    private var myStashSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("My stash")
                .font(.headline)
                .padding(.horizontal)
                .padding(.bottom, 8)

            List {
                Section {
                    HStack {
                        Text("Colorway")
                        Spacer()
                        TextField("None", text: $viewModel.colorway)
                            .multilineTextAlignment(.trailing)
                            .foregroundStyle(.primary)
                    }

                    Stepper(
                        value: $viewModel.skeins,
                        in: 0.5...999,
                        step: 0.5
                    ) {
                        HStack {
                            Text("Skeins")
                            Spacer()
                            Text("\(viewModel.skeins, specifier: "%.1f")")
                                .foregroundStyle(.secondary)
                        }
                    }

                    Picker("Status", selection: $viewModel.status) {
                        ForEach(viewModel.statusOptions, id: \.value) { option in
                            Text(option.label).tag(option.value)
                        }
                    }
                }

                Section("Notes") {
                    TextEditor(text: $viewModel.notes)
                        .frame(minHeight: 80)
                }

                if viewModel.hasChanges {
                    Section {
                        saveButton
                    }
                }
            }
            .listStyle(.insetGrouped)
            .scrollDisabled(true)
            .frame(height: myStashListHeight)
        }
    }

    private var saveButton: some View {
        Button {
            Task { await viewModel.save() }
        } label: {
            HStack {
                Spacer()
                if viewModel.isSaving {
                    ProgressView().controlSize(.small)
                } else {
                    Text("Save changes")
                        .fontWeight(.semibold)
                }
                Spacer()
            }
        }
        .disabled(viewModel.isSaving)
        .listRowBackground(Color(hex: "#FF6B6B"))
        .foregroundStyle(.white)
    }

    private var myStashListHeight: CGFloat {
        let baseHeight: CGFloat = 320
        let saveButtonHeight: CGFloat = viewModel.hasChanges ? 60 : 0
        return baseHeight + saveButtonHeight
    }

    // MARK: - Projects

    private func projectsSection(item: StashItem) -> some View {
        Group {
            if let projects = item.projects, !projects.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Used in projects")
                        .font(.headline)
                        .padding(.horizontal)

                    ForEach(projects) { project in
                        NavigationLink(value: Route.projectDetail(id: project.id)) {
                            projectRow(project: project)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func projectRow(project: StashLinkedProject) -> some View {
        HStack(spacing: 12) {
            projectThumbnail(project: project)

            VStack(alignment: .leading, spacing: 3) {
                Text(project.title)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)

                Text(project.status.replacingOccurrences(of: "_", with: " ").capitalized)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(statusColor(project.status).opacity(0.15))
                    .foregroundStyle(statusColor(project.status))
                    .clipShape(Capsule())
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
    }

    @ViewBuilder
    private func projectThumbnail(project: StashLinkedProject) -> some View {
        if let photo = project.photos?.first, let url = URL(string: photo.url) {
            AsyncImage(url: url) { image in
                image.resizable().aspectRatio(contentMode: .fill)
            } placeholder: {
                Color(.systemGray5)
            }
            .frame(width: 44, height: 44)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        } else {
            RoundedRectangle(cornerRadius: 8)
                .fill(Color(.systemGray5))
                .frame(width: 44, height: 44)
                .overlay {
                    Image(systemName: "hammer")
                        .font(.system(size: 16))
                        .foregroundStyle(.secondary)
                }
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "active": return Color(hex: "#4ECDC4")
        case "completed": return .green
        case "frogged": return .orange
        case "hibernating": return .purple
        default: return .secondary
        }
    }

    // MARK: - Danger Zone

    private var dangerZoneSection: some View {
        VStack(spacing: 0) {
            Divider()
                .padding(.horizontal)

            Button(role: .destructive) {
                showDeleteConfirmation = true
            } label: {
                HStack {
                    Spacer()
                    if viewModel.isDeleting {
                        ProgressView().controlSize(.small).tint(.red)
                    } else {
                        Label("Delete stash item", systemImage: "trash")
                    }
                    Spacer()
                }
                .padding(.vertical, 14)
            }
            .disabled(viewModel.isDeleting)
            .padding(.horizontal)
        }
        .padding(.top, 8)
    }
}

// MARK: - Camera View (UIImagePickerController wrapper)

struct CameraView: UIViewControllerRepresentable {
    let onCapture: (Data) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onCapture: onCapture, dismiss: dismiss)
    }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let onCapture: (Data) -> Void
        let dismiss: DismissAction

        init(onCapture: @escaping (Data) -> Void, dismiss: DismissAction) {
            self.onCapture = onCapture
            self.dismiss = dismiss
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage,
               let data = image.jpegData(compressionQuality: 0.8) {
                onCapture(data)
            }
            dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            dismiss()
        }
    }
}
