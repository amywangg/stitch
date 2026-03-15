import SwiftUI

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
            let _: APIResponse<CraftingSession> = try await APIClient.shared.post(
                "/sessions",
                body: Body(
                    project_id: projectId,
                    source: "manual",
                    duration_minutes: durationMinutes,
                    date: ISO8601DateFormatter().string(from: date),
                    notes: notes.isEmpty ? nil : notes
                )
            )
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
