import Foundation
import Speech
import AVFoundation

// MARK: - Voice Command

enum VoiceCommand: String, CaseIterable {
    case increment
    case decrement
    case undo
    case advanceStep
    case queryStatus
    case startSession
    case pauseSession
    case stopSession
    case castOn

    /// Human-readable description of the command for the help popover.
    var helpLabel: String {
        switch self {
        case .increment: return "\"plus one\" / \"increase\" / \"next\" / \"knit\""
        case .decrement: return "\"minus one\" / \"decrease\" / \"back\" / \"decrease row\""
        case .undo: return "\"undo\" / \"oops\""
        case .advanceStep: return "\"next step\" / \"advance\""
        case .queryStatus: return "\"what row\" / \"where am I\""
        case .startSession: return "\"start session\" / \"start timer\""
        case .pauseSession: return "\"pause session\" / \"pause timer\""
        case .stopSession: return "\"stop session\" / \"end session\" / \"stop timer\""
        case .castOn: return "\"cast on\" / \"cast on mode\""
        }
    }

    var helpAction: String {
        switch self {
        case .increment: return "Count +1"
        case .decrement: return "Count -1"
        case .undo: return "Undo last action"
        case .advanceStep: return "Next step"
        case .queryStatus: return "Read current row"
        case .startSession: return "Start timed session"
        case .pauseSession: return "Pause session"
        case .stopSession: return "End session"
        case .castOn: return "Enter cast-on mode"
        }
    }

    /// Parses a recognized speech string into a command.
    /// Returns nil if no command matched.
    static func parse(_ text: String) -> VoiceCommand? {
        let lower = text.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)

        // Cast on (check before "next" to avoid conflict)
        if lower.contains("cast on") {
            return .castOn
        }

        // Session controls (check before simpler matches)
        if lower.contains("start session") || lower.contains("start timer") {
            return .startSession
        }
        if lower.contains("pause session") || lower.contains("pause timer") {
            return .pauseSession
        }
        if lower.contains("stop session") || lower.contains("end session")
            || lower.contains("stop timer") {
            return .stopSession
        }

        // Advance step (check before "next" to avoid conflict)
        if lower.contains("next step") || lower.contains("advance") {
            return .advanceStep
        }

        // Increment
        if lower.contains("plus one") || lower.contains("increase")
            || lower.contains("next") || lower.contains("knit") {
            return .increment
        }

        // Decrement
        if lower.contains("minus one") || lower.contains("decrease")
            || lower.contains("decrease row") || lower.contains("back") {
            return .decrement
        }

        // Undo
        if lower.contains("undo") || lower.contains("oops") {
            return .undo
        }

        // Query status
        if lower.contains("what row") || lower.contains("where am i") {
            return .queryStatus
        }

        return nil
    }
}

// MARK: - Voice Counter Manager

@Observable
final class VoiceCounterManager {
    var isListening = false
    var lastCommand: VoiceCommand?
    var lastFeedback: String?
    var permissionDenied = false

    /// Callback fired when a command is recognized
    var onCommand: ((VoiceCommand) -> Void)?

    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var audioEngine = AVAudioEngine()
    private var lastCommandTime: Date = .distantPast
    private let cooldownInterval: TimeInterval = 1.0

    private let synthesizer = AVSpeechSynthesizer()

    init() {
        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    }

    // MARK: - Permissions

    func requestPermissions() async -> Bool {
        // Speech recognition permission
        let speechStatus = await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status)
            }
        }
        guard speechStatus == .authorized else {
            permissionDenied = true
            return false
        }

        // Microphone permission
        let audioStatus: Bool
        if #available(iOS 17.0, *) {
            audioStatus = await AVAudioApplication.requestRecordPermission()
        } else {
            audioStatus = await withCheckedContinuation { continuation in
                AVAudioSession.sharedInstance().requestRecordPermission { granted in
                    continuation.resume(returning: granted)
                }
            }
        }
        guard audioStatus else {
            permissionDenied = true
            return false
        }

        return true
    }

    // MARK: - Start / Stop

    func startListening() async {
        guard !isListening else { return }
        guard let speechRecognizer, speechRecognizer.isAvailable else { return }

        let permitted = await requestPermissions()
        guard permitted else { return }

        do {
            try startRecognition()
            isListening = true
        } catch {
            lastFeedback = "Could not start voice recognition"
        }
    }

    func stopListening() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionRequest = nil
        recognitionTask = nil
        isListening = false
    }

    // MARK: - Speak

    func speak(_ text: String) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        synthesizer.speak(utterance)
    }

    // MARK: - Private

    private func startRecognition() throws {
        // Cancel any existing task
        recognitionTask?.cancel()
        recognitionTask = nil

        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker, .allowBluetooth])
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest else { return }

        recognitionRequest.shouldReportPartialResults = true
        recognitionRequest.requiresOnDeviceRecognition = true // Privacy: on-device only

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            self?.recognitionRequest?.append(buffer)
        }

        audioEngine.prepare()
        try audioEngine.start()

        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self else { return }

            if let result {
                let text = result.bestTranscription.formattedString
                self.processRecognizedText(text)
            }

            if error != nil || (result?.isFinal ?? false) {
                // Restart recognition on completion/error (continuous listening)
                self.audioEngine.stop()
                inputNode.removeTap(onBus: 0)
                self.recognitionRequest = nil
                self.recognitionTask = nil

                if self.isListening {
                    // Restart after a brief delay
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        guard self.isListening else { return }
                        do {
                            try self.startRecognition()
                        } catch {
                            self.isListening = false
                            self.lastFeedback = "Voice recognition stopped"
                        }
                    }
                }
            }
        }
    }

    private func processRecognizedText(_ text: String) {
        // Cooldown: ignore commands within 1 second of the last one
        let now = Date()
        guard now.timeIntervalSince(lastCommandTime) >= cooldownInterval else { return }

        guard let command = VoiceCommand.parse(text) else { return }

        // Avoid re-firing the same command from partial results
        if command == lastCommand, now.timeIntervalSince(lastCommandTime) < 2.0 { return }

        lastCommandTime = now
        lastCommand = command

        DispatchQueue.main.async { [weak self] in
            self?.onCommand?(command)
        }
    }
}
