import SwiftUI
import PhotosUI

struct ManualSessionSheet: View {
    let projectId: String
    var onSaved: (() -> Void)?

    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss
    @State private var date = Date()
    @State private var durationMinutes = 30
    @State private var notes = ""
    @State private var isSaving = false
    @State private var error: String?

    // Photo
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var selectedPhotoData: Data?
    @State private var selectedPhotoImage: Image?

    // Share as post
    @State private var shareAsPost = false

    private let durationOptions = Array(stride(from: 5, through: 240, by: 5))

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    DatePicker("Date", selection: $date, in: ...Date(), displayedComponents: .date)

                    Picker("Duration", selection: $durationMinutes) {
                        ForEach(durationOptions, id: \.self) { mins in
                            Text(formatDuration(mins)).tag(mins)
                        }
                    }
                }

                Section("Notes") {
                    TextField("What did you work on?", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }

                // Photo section
                Section("Photo") {
                    if let selectedPhotoImage {
                        selectedPhotoImage
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(height: 180)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                            .overlay(alignment: .topTrailing) {
                                Button {
                                    self.selectedPhotoItem = nil
                                    self.selectedPhotoData = nil
                                    self.selectedPhotoImage = nil
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .font(.title3)
                                        .foregroundStyle(.white)
                                        .shadow(radius: 2)
                                }
                                .padding(8)
                            }
                    }

                    PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                        Label(
                            selectedPhotoData != nil ? "Change photo" : "Add a photo",
                            systemImage: "camera"
                        )
                        .foregroundStyle(theme.primary)
                    }
                }

                // Share as post
                Section {
                    Toggle("Share as post", isOn: $shareAsPost)
                } footer: {
                    Text("Post your session to the feed for friends to see.")
                }

                if let error {
                    Section {
                        Text(error)
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Log session")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task { await save() }
                    }
                    .disabled(isSaving)
                }
            }
            .onChange(of: selectedPhotoItem) { _, item in
                guard let item else { return }
                Task {
                    if let data = try? await item.loadTransferable(type: Data.self) {
                        selectedPhotoData = data
                        #if canImport(UIKit)
                        if let uiImage = UIImage(data: data) {
                            selectedPhotoImage = Image(uiImage: uiImage)
                        }
                        #endif
                    }
                }
            }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        struct Body: Encodable {
            let project_id: String
            let source: String
            let duration_minutes: Int
            let date: String
            let notes: String?
        }

        do {
            let sessionResponse: APIResponse<CraftingSession> = try await APIClient.shared.post(
                "/sessions",
                body: Body(
                    project_id: projectId,
                    source: "manual",
                    duration_minutes: durationMinutes,
                    date: ISO8601DateFormatter().string(from: date),
                    notes: notes.isEmpty ? nil : notes
                )
            )

            // Upload photo to project if provided
            if let photoData = selectedPhotoData {
                let _: APIResponse<ProjectPhoto> = try await APIClient.shared.upload(
                    "/projects/\(projectId)/photos",
                    imageData: photoData,
                    mimeType: "image/jpeg",
                    fileName: "session_photo.jpg"
                )
            }

            // Share as post if toggled
            if shareAsPost {
                var postContent = "Logged a \(formatDuration(durationMinutes)) session"
                if !notes.isEmpty { postContent += ": \(notes)" }
                struct PostBody: Encodable {
                    let content: String
                    let project_id: String
                    let session_minutes: Int
                }
                struct PostResult: Decodable { let id: String }
                let postResponse: APIResponse<PostResult> = try await APIClient.shared.post(
                    "/social/posts",
                    body: PostBody(
                        content: postContent,
                        project_id: projectId,
                        session_minutes: durationMinutes
                    )
                )

                // Upload photo to the post if provided
                if let photoData = selectedPhotoData {
                    struct PhotoResult: Decodable { let url: String }
                    let _: APIResponse<PhotoResult> = try await APIClient.shared.upload(
                        "/social/posts/photo",
                        imageData: photoData,
                        mimeType: "image/jpeg",
                        fileName: "session_photo.jpg",
                        fields: ["post_id": postResponse.data.id]
                    )
                }
            }

            onSaved?()
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func formatDuration(_ mins: Int) -> String {
        if mins < 60 {
            return "\(mins) min"
        }
        let hours = mins / 60
        let remaining = mins % 60
        if remaining == 0 {
            return "\(hours) hr"
        }
        return "\(hours) hr \(remaining) min"
    }
}
