import Foundation

// MARK: - Model

struct UserMeasurements: Codable {
    let id: String?
    let userId: String?
    let unitPreference: String
    let bustCm: Double?
    let waistCm: Double?
    let hipCm: Double?
    let shoulderWidthCm: Double?
    let backLengthCm: Double?
    let armLengthCm: Double?
    let upperArmCm: Double?
    let wristCm: Double?
    let headCircumferenceCm: Double?
    let inseamCm: Double?
    let footLengthCm: Double?
    let footCircumferenceCm: Double?
    let heightCm: Double?
    let notes: String?
}

// MARK: - Standard Size Presets

enum StandardSize: String, CaseIterable, Identifiable {
    case xs, s, m, l, xl, xxl, xxxl

    var id: String { rawValue }

    var label: String {
        switch self {
        case .xs: return "XS"
        case .s: return "S"
        case .m: return "M"
        case .l: return "L"
        case .xl: return "XL"
        case .xxl: return "2XL"
        case .xxxl: return "3XL"
        }
    }

    /// Approximate measurements in cm for each standard size (women's)
    var bust: Double {
        switch self {
        case .xs: return 80
        case .s: return 87
        case .m: return 94
        case .l: return 102
        case .xl: return 112
        case .xxl: return 122
        case .xxxl: return 132
        }
    }

    var waist: Double {
        switch self {
        case .xs: return 63
        case .s: return 70
        case .m: return 77
        case .l: return 85
        case .xl: return 95
        case .xxl: return 105
        case .xxxl: return 115
        }
    }

    var hip: Double {
        switch self {
        case .xs: return 88
        case .s: return 95
        case .m: return 102
        case .l: return 110
        case .xl: return 120
        case .xxl: return 130
        case .xxxl: return 140
        }
    }

    var shoulderWidth: Double {
        switch self {
        case .xs: return 37
        case .s: return 39
        case .m: return 41
        case .l: return 43
        case .xl: return 45
        case .xxl: return 47
        case .xxxl: return 49
        }
    }

    var headCircumference: Double { 56 } // fairly universal
}

// MARK: - Shoe Size

enum ShoeSystem: String, CaseIterable, Identifiable {
    case us, eu, uk
    var id: String { rawValue }
    var label: String {
        switch self {
        case .us: return "US"
        case .eu: return "EU"
        case .uk: return "UK"
        }
    }
}

struct ShoeSize {
    /// Convert shoe size to foot length in cm
    static func toFootLength(size: Double, system: ShoeSystem) -> Double {
        switch system {
        case .us:
            // Women's US: length_cm ≈ (size + 22) * 0.847 ... simplified:
            // US 5 = 22cm, US 6 = 23cm, etc. (roughly 0.85cm per half size)
            return 20.8 + (size * 0.847)
        case .eu:
            // EU = length_cm * 1.5 + 2 → length_cm = (EU - 2) / 1.5
            return (size - 2) / 1.5
        case .uk:
            // UK ≈ US - 2 for women's
            return 20.8 + ((size + 2) * 0.847)
        }
    }

    static let usSizes: [Double] = Array(stride(from: 4, through: 15, by: 0.5))
    static let euSizes: [Double] = Array(stride(from: 35, through: 48, by: 1))
    static let ukSizes: [Double] = Array(stride(from: 2, through: 13, by: 0.5))

    static func sizes(for system: ShoeSystem) -> [Double] {
        switch system {
        case .us: return usSizes
        case .eu: return euSizes
        case .uk: return ukSizes
        }
    }
}

// MARK: - ViewModel

@Observable
final class MeasurementsViewModel {
    // Unit preference
    var useInches = false

    // Upper body
    var bust: String = ""
    var waist: String = ""
    var hip: String = ""
    var shoulderWidth: String = ""
    var backLength: String = ""
    var armLength: String = ""
    var upperArm: String = ""
    var wrist: String = ""

    // Head
    var headCircumference: String = ""

    // Lower body
    var inseam: String = ""

    // Feet
    var shoeSystem: ShoeSystem = .us
    var shoeSize: Double?
    var footLength: String = ""
    var footCircumference: String = ""

    // General
    var height: String = ""

    // State
    var isLoading = false
    var isSaving = false
    var error: String?
    var didSave = false
    var hasLoaded = false

    // Quick size
    var selectedSize: StandardSize?

    // MARK: - Conversion

    private let cmToInch = 0.393701
    private let inchToCm = 2.54

    func displayValue(_ cmValue: Double?) -> String {
        guard let cm = cmValue else { return "" }
        if useInches {
            return String(format: "%.1f", cm * cmToInch)
        }
        return String(format: "%.1f", cm)
    }

    func toCm(_ displayString: String) -> Double? {
        guard let value = Double(displayString), value > 0 else { return nil }
        return useInches ? value * inchToCm : value
    }

    var unitLabel: String { useInches ? "in" : "cm" }

    // MARK: - Quick Size

    func applySize(_ size: StandardSize) {
        selectedSize = size
        bust = displayValue(size.bust)
        waist = displayValue(size.waist)
        hip = displayValue(size.hip)
        shoulderWidth = displayValue(size.shoulderWidth)
        headCircumference = displayValue(size.headCircumference)
    }

    // MARK: - Shoe Size

    func applyShoeSize() {
        guard let size = shoeSize else { return }
        let lengthCm = ShoeSize.toFootLength(size: size, system: shoeSystem)
        footLength = displayValue(lengthCm)
    }

    // MARK: - Unit Toggle

    func toggleUnit() {
        // Convert all current display values to cm first
        let bustCm = toCm(bust)
        let waistCm = toCm(waist)
        let hipCm = toCm(hip)
        let shoulderCm = toCm(shoulderWidth)
        let backCm = toCm(backLength)
        let armCm = toCm(armLength)
        let upperArmCm = toCm(upperArm)
        let wristCm = toCm(wrist)
        let headCm = toCm(headCircumference)
        let inseamCm = toCm(inseam)
        let footLenCm = toCm(footLength)
        let footCircCm = toCm(footCircumference)
        let heightCm = toCm(height)

        // Toggle
        useInches.toggle()

        // Re-display in new unit
        bust = displayValue(bustCm)
        waist = displayValue(waistCm)
        hip = displayValue(hipCm)
        shoulderWidth = displayValue(shoulderCm)
        backLength = displayValue(backCm)
        armLength = displayValue(armCm)
        upperArm = displayValue(upperArmCm)
        wrist = displayValue(wristCm)
        headCircumference = displayValue(headCm)
        inseam = displayValue(inseamCm)
        footLength = displayValue(footLenCm)
        footCircumference = displayValue(footCircCm)
        height = displayValue(heightCm)
    }

    // MARK: - Load

    func load() async {
        guard !hasLoaded else { return }
        isLoading = true
        defer { isLoading = false; hasLoaded = true }
        do {
            let response: APIResponse<UserMeasurements?> = try await APIClient.shared.get("/measurements")
            guard let m = response.data else { return }

            useInches = m.unitPreference == "inches"
            bust = displayValue(m.bustCm)
            waist = displayValue(m.waistCm)
            hip = displayValue(m.hipCm)
            shoulderWidth = displayValue(m.shoulderWidthCm)
            backLength = displayValue(m.backLengthCm)
            armLength = displayValue(m.armLengthCm)
            upperArm = displayValue(m.upperArmCm)
            wrist = displayValue(m.wristCm)
            headCircumference = displayValue(m.headCircumferenceCm)
            inseam = displayValue(m.inseamCm)
            footLength = displayValue(m.footLengthCm)
            footCircumference = displayValue(m.footCircumferenceCm)
            height = displayValue(m.heightCm)
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Save

    struct MeasurementsBody: Encodable {
        let unit_preference: String
        let bust_cm: Double?
        let waist_cm: Double?
        let hip_cm: Double?
        let shoulder_width_cm: Double?
        let back_length_cm: Double?
        let arm_length_cm: Double?
        let upper_arm_cm: Double?
        let wrist_cm: Double?
        let head_circumference_cm: Double?
        let inseam_cm: Double?
        let foot_length_cm: Double?
        let foot_circumference_cm: Double?
        let height_cm: Double?
    }

    func save() async {
        isSaving = true
        defer { isSaving = false }
        do {
            let body = MeasurementsBody(
                unit_preference: useInches ? "inches" : "cm",
                bust_cm: toCm(bust),
                waist_cm: toCm(waist),
                hip_cm: toCm(hip),
                shoulder_width_cm: toCm(shoulderWidth),
                back_length_cm: toCm(backLength),
                arm_length_cm: toCm(armLength),
                upper_arm_cm: toCm(upperArm),
                wrist_cm: toCm(wrist),
                head_circumference_cm: toCm(headCircumference),
                inseam_cm: toCm(inseam),
                foot_length_cm: toCm(footLength),
                foot_circumference_cm: toCm(footCircumference),
                height_cm: toCm(height)
            )
            let _: APIResponse<UserMeasurements> = try await APIClient.shared.put(
                "/measurements", body: body
            )
            didSave = true
        } catch {
            self.error = error.localizedDescription
        }
    }

    var hasAnyMeasurement: Bool {
        [bust, waist, hip, shoulderWidth, backLength, armLength,
         upperArm, wrist, headCircumference, inseam, footLength,
         footCircumference, height].contains { !$0.isEmpty }
    }
}
