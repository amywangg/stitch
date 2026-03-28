import SwiftUI

/// Popover showing all available voice commands.
struct VoiceCommandHelpView: View {
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        NavigationStack {
            List {
                Section("Voice commands") {
                    ForEach(VoiceCommand.allCases, id: \.rawValue) { command in
                        HStack(alignment: .top, spacing: 12) {
                            Text(command.helpAction)
                                .font(.subheadline.weight(.medium))
                                .frame(width: 120, alignment: .leading)

                            Text(command.helpLabel)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 2)
                    }
                }

                Section {
                    Label("Speak clearly after the mic icon pulses. There's a 1-second cooldown between commands.", systemImage: "info.circle")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Voice commands")
            .navigationBarTitleDisplayMode(.inline)
        }
        .frame(minWidth: 320, minHeight: 400)
    }
}
