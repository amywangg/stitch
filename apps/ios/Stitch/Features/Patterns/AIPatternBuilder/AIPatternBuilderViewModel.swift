import Foundation

struct YarnEntry: Identifiable {
    let id = UUID().uuidString
    var name: String = ""
    var weight: String = "worsted"
    var fiberContent: String = ""
    var strands: Int = 1
    var fromStash: Bool = false
}

@Observable
final class AIPatternBuilderViewModel {
    // Stage
    var currentStage: Int = 1
    let totalStages = 5

    // Stage 1: Project type
    var config: PatternBuilderConfig?
    var isLoadingConfig = false
    var selectedProjectType: String?

    // Stage 2: Yarns
    var yarns: [YarnEntry] = [YarnEntry()]

    // Stage 3: Options
    var answers: [String: String] = [:]

    // Stage 4: Size
    var targetSize: String?
    var customMeasurements: [String: Double] = [:]

    // Stage 5: Generate
    var needleSizeOverride: String = ""
    var gaugeStitchesOverride: String = ""
    var gaugeRowsOverride: String = ""
    var isGenerating = false
    var generatedPatternId: String?

    var error: String?

    // Measurements integration
    var userMeasurements: [String: Double]?
    var isLoadingMeasurements = false
    var recommendedSizeName: String?

    // MARK: - Config

    var selectedProjectConfig: ProjectTypeConfig? {
        config?.projectTypes.first { $0.type == selectedProjectType }
    }

    var availableSizes: [String] {
        guard let key = selectedProjectConfig?.sizeChartKey,
              let chart = config?.sizeCharts[key] else { return [] }
        return Array(chart.keys).sorted()
    }

    var sizeChartForProject: [String: [String: Double]] {
        guard let key = selectedProjectConfig?.sizeChartKey else { return [:] }
        return config?.sizeCharts[key] ?? [:]
    }

    var isDimensionBased: Bool {
        guard let type = selectedProjectType else { return false }
        return type == "scarf_cowl" || type == "blanket"
    }

    func loadConfig() async {
        isLoadingConfig = true
        defer { isLoadingConfig = false }
        do {
            let response: APIResponse<PatternBuilderConfig> = try await APIClient.shared.get(
                "/ai/pattern-builder/config"
            )
            config = response.data
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Questions

    func visibleQuestions() -> [BuilderQuestion] {
        guard let questions = selectedProjectConfig?.questions else { return [] }
        return questions.filter { question in
            guard let dep = question.dependsOn else { return true }
            guard let answer = answers[dep.key] else { return false }
            return dep.values.contains(answer)
        }
    }

    func initializeDefaults() {
        guard let questions = selectedProjectConfig?.questions else { return }
        for question in questions {
            if answers[question.key] != nil { continue }
            if question.type == "boolean" {
                answers[question.key] = "false"
            } else if let defaultOption = question.options?.first(where: { $0.default == true }) {
                answers[question.key] = defaultOption.value
            }
        }
    }

    // MARK: - Validation

    func canAdvance() -> Bool {
        switch currentStage {
        case 1:
            return selectedProjectType != nil
        case 2:
            return yarns.allSatisfy { !$0.name.trimmingCharacters(in: .whitespaces).isEmpty }
        case 3:
            let visible = visibleQuestions()
            return visible.filter(\.required).allSatisfy { q in
                guard let answer = answers[q.key] else { return false }
                return !answer.isEmpty
            }
        case 4:
            if isDimensionBased {
                return true // dimensions are optional, have defaults
            }
            return targetSize != nil
        case 5:
            return true
        default:
            return false
        }
    }

    func advance() {
        guard canAdvance(), currentStage < totalStages else { return }
        currentStage += 1
        if currentStage == 3 {
            initializeDefaults()
        }
        if currentStage == 4 && !isDimensionBased {
            // Pick middle size as default
            let sizes = availableSizes
            if targetSize == nil, !sizes.isEmpty {
                targetSize = sizes[sizes.count / 2]
            }
        }
    }

    func goBack() {
        guard currentStage > 1 else { return }
        currentStage -= 1
    }

    // MARK: - Generate

    func generate() async {
        isGenerating = true
        defer { isGenerating = false }

        var options: [String: Any] = ["type": selectedProjectType ?? ""]
        for (key, value) in answers {
            options[key] = value
        }

        var body: [String: Any] = [
            "project_type": selectedProjectType ?? "",
            "yarns": yarns.map { yarn -> [String: Any] in
                var y: [String: Any] = [
                    "name": yarn.name,
                    "weight": yarn.weight,
                    "strands": yarn.strands,
                ]
                if !yarn.fiberContent.isEmpty {
                    y["fiber_content"] = yarn.fiberContent
                }
                return y
            },
            "options": options,
        ]

        if let size = targetSize {
            body["target_size"] = size
        }

        if !customMeasurements.isEmpty {
            body["custom_measurements"] = customMeasurements
        }

        if let mm = Double(needleSizeOverride) {
            body["needle_size_mm"] = mm
        }

        let sts = Double(gaugeStitchesOverride)
        let rows = Double(gaugeRowsOverride)
        if let sts, let rows {
            body["gauge_override"] = [
                "stitches_per_10cm": sts,
                "rows_per_10cm": rows,
            ]
        }

        do {
            let data = try await APIClient.shared.post("/ai/pattern-builder", body: body)
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            let patternData = json?["data"] as? [String: Any]
            generatedPatternId = patternData?["id"] as? String
        } catch {
            self.error = error.localizedDescription
        }
    }

    func generateTemplate() async {
        var options: [String: Any] = ["type": selectedProjectType ?? ""]
        for (key, value) in answers {
            options[key] = value
        }

        var body: [String: Any] = [
            "project_type": selectedProjectType ?? "",
            "yarns": yarns.map { yarn -> [String: Any] in
                var y: [String: Any] = [
                    "name": yarn.name,
                    "weight": yarn.weight,
                    "strands": yarn.strands,
                ]
                if !yarn.fiberContent.isEmpty {
                    y["fiber_content"] = yarn.fiberContent
                }
                return y
            },
            "options": options,
        ]

        if let size = targetSize {
            body["target_size"] = size
        }

        if !customMeasurements.isEmpty {
            body["custom_measurements"] = customMeasurements
        }

        if let mm = Double(needleSizeOverride) {
            body["needle_size_mm"] = mm
        }

        let sts = Double(gaugeStitchesOverride)
        let rows = Double(gaugeRowsOverride)
        if let sts, let rows {
            body["gauge_override"] = [
                "stitches_per_10cm": sts,
                "rows_per_10cm": rows,
            ]
        }

        do {
            let data = try await APIClient.shared.post("/patterns/generate", body: body)
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            let patternData = json?["data"] as? [String: Any]
            generatedPatternId = patternData?["id"] as? String
        } catch is CancellationError {
            // View dismissed — ignore
        } catch {
            self.error = error.localizedDescription
        }
    }

    func loadMeasurements() async {
        isLoadingMeasurements = true
        defer { isLoadingMeasurements = false }
        do {
            let response: APIResponse<UserMeasurements?> = try await APIClient.shared.get("/measurements")
            guard let m = response.data else {
                userMeasurements = [:]
                return
            }
            var dict: [String: Double] = [:]
            if let v = m.bustCm { dict["bust_cm"] = v }
            if let v = m.shoulderWidthCm { dict["shoulder_width_cm"] = v }
            if let v = m.armLengthCm { dict["arm_length_cm"] = v }
            if let v = m.upperArmCm { dict["upper_arm_cm"] = v }
            if let v = m.backLengthCm { dict["back_length_cm"] = v }
            if let v = m.headCircumferenceCm { dict["head_circumference_cm"] = v }
            if let v = m.footLengthCm { dict["foot_length_cm"] = v }
            if let v = m.footCircumferenceCm { dict["foot_circumference_cm"] = v }
            userMeasurements = dict
            recommendSize()
        } catch is CancellationError {
            // View dismissed — ignore
        } catch {
            self.error = error.localizedDescription
        }
    }

    func recommendSize() {
        guard let measurements = userMeasurements,
              let projectType = selectedProjectType else { return }

        // Map project type to primary measurement key
        let primaryKey: String
        switch projectType {
        case "hat": primaryKey = "head_circumference_cm"
        case "sweater": primaryKey = "bust_cm"
        case "socks": primaryKey = "foot_length_cm"
        case "mittens": primaryKey = "hand_circumference_cm"
        default: return
        }

        guard let userValue = measurements[primaryKey] else { return }

        let chart = sizeChartForProject
        var bestSize: String?
        var bestDiff = Double.infinity

        for (sizeName, sizeMeasurements) in chart {
            if let chartValue = sizeMeasurements[primaryKey] {
                let diff = abs(chartValue - userValue)
                if diff < bestDiff {
                    bestDiff = diff
                    bestSize = sizeName
                }
            }
        }

        if let best = bestSize {
            recommendedSizeName = best
            targetSize = best
        }
    }

    // MARK: - Stash Helpers

    func addYarnFromStash(_ item: StashItem) {
        var entry = YarnEntry()
        if let company = item.yarn?.company?.name, let name = item.yarn?.name {
            entry.name = "\(company) \(name)"
        } else {
            entry.name = item.yarn?.name ?? "Unknown yarn"
        }
        entry.weight = item.yarn?.weight ?? "worsted"
        entry.fiberContent = item.yarn?.fiberContent ?? ""
        entry.fromStash = true
        yarns.append(entry)
    }

    func removeYarn(at index: Int) {
        guard yarns.count > 1 else { return }
        yarns.remove(at: index)
    }

    // MARK: - Icons

    static func iconForProjectType(_ type: String) -> String {
        switch type {
        case "hat": return "crown"
        case "sweater": return "tshirt"
        case "socks": return "shoeprint.fill"
        case "mittens": return "hand.raised"
        case "scarf_cowl": return "wind"
        case "blanket": return "bed.double"
        default: return "questionmark"
        }
    }
}
