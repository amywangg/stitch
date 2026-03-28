import SwiftUI

// MARK: - Ravelry Pattern Header

struct RavelryPatternHeader: View {
    @Environment(ThemeManager.self) private var theme
    let detail: RavelryPatternDetail
    @Binding var selectedPhotoIndex: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Photo gallery
            if !detail.photos.isEmpty {
                photoGallery(detail.photos)
            }

            VStack(alignment: .leading, spacing: 20) {
                titleSection
            }
            .padding()
        }
    }

    // MARK: - Photo Gallery

    private func photoGallery(_ photos: [String]) -> some View {
        TabView(selection: $selectedPhotoIndex) {
            ForEach(Array(photos.enumerated()), id: \.offset) { index, urlStr in
                if let url = URL(string: urlStr) {
                    AsyncImage(url: url) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Color.secondary.opacity(0.1)
                            .overlay { ProgressView() }
                    }
                    .tag(index)
                }
            }
        }
        .tabViewStyle(.page(indexDisplayMode: photos.count > 1 ? .always : .never))
        .frame(height: 360)
        .clipped()
    }

    // MARK: - Title Section

    private var titleSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(detail.name)
                .font(.title2.weight(.bold))

            if let designer = detail.designer {
                Text("by \(designer)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 12) {
                if let rating = detail.rating {
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .foregroundStyle(theme.primary)
                        Text(String(format: "%.1f", rating))
                            .fontWeight(.medium)
                        Text("(\(detail.ratingCount))")
                            .foregroundStyle(.secondary)
                    }
                    .font(.subheadline)
                }

                if detail.free {
                    Text("Free")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.green)
                } else if let price = detail.price, price > 0 {
                    Text(formatPrice(price, currency: detail.currency))
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.primary)
                }
            }
            .padding(.top, 2)

            if !detail.patternCategories.isEmpty {
                Text(detail.patternCategories.joined(separator: " · "))
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
        }
    }

    // MARK: - Helpers

    private func formatPrice(_ price: Double, currency: String?) -> String {
        let symbol: String
        switch currency?.uppercased() {
        case "USD": symbol = "$"
        case "EUR": symbol = "€"
        case "GBP": symbol = "£"
        case "CAD": symbol = "CA$"
        case "AUD": symbol = "A$"
        case "SEK": symbol = ""
        case "NOK": symbol = ""
        case "DKK": symbol = ""
        default: symbol = "$"
        }
        if symbol.isEmpty {
            return String(format: "%.2f %@", price, currency ?? "")
        }
        return String(format: "%@%.2f", symbol, price)
    }
}
