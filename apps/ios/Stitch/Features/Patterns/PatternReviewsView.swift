import SwiftUI

// MARK: - ViewModel

@Observable
final class PatternReviewsViewModel {
    var reviews: [PatternReview] = []
    var userReview: PatternReview?
    var total = 0
    var hasMore = false
    var page = 1
    var isLoading = false
    var error: String?

    let patternId: String

    init(patternId: String) {
        self.patternId = patternId
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        page = 1
        do {
            let response: APIResponse<ReviewsResponse> = try await APIClient.shared.get(
                "/patterns/\(patternId)/reviews?page=1&limit=20"
            )
            reviews = response.data.items
            total = response.data.total
            hasMore = response.data.hasMore
            userReview = response.data.userReview
        } catch is CancellationError {
            // View dismissed
        } catch {
            self.error = error.localizedDescription
        }
    }

    func loadMore() async {
        guard hasMore, !isLoading else { return }
        page += 1
        do {
            let response: APIResponse<ReviewsResponse> = try await APIClient.shared.get(
                "/patterns/\(patternId)/reviews?page=\(page)&limit=20"
            )
            reviews.append(contentsOf: response.data.items)
            hasMore = response.data.hasMore
        } catch is CancellationError {
            // View dismissed
        } catch {
            self.error = error.localizedDescription
        }
    }

    func submitReview(rating: Double, difficultyRating: Double?, content: String?, wouldMakeAgain: Bool?, projectId: String?) async {
        do {
            var body: [String: Any] = ["rating": rating]
            if let dr = difficultyRating { body["difficulty_rating"] = dr }
            if let c = content, !c.isEmpty { body["content"] = c }
            if let wma = wouldMakeAgain { body["would_make_again"] = wma }
            if let pid = projectId { body["project_id"] = pid }

            if userReview != nil {
                let _ = try await APIClient.shared.patch(
                    "/patterns/\(patternId)/reviews",
                    body: body
                )
            } else {
                let _ = try await APIClient.shared.post(
                    "/patterns/\(patternId)/reviews",
                    body: body
                )
            }
            await load()
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deleteReview() async {
        do {
            struct Empty: Decodable {}
            let _: APIResponse<Empty> = try await APIClient.shared.delete(
                "/patterns/\(patternId)/reviews"
            )
            userReview = nil
            await load()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - Reviews Section (embeddable in PatternDetailView)

struct PatternReviewsSection: View {
    @Environment(ThemeManager.self) private var theme
    let viewModel: PatternReviewsViewModel
    @Binding var showWriteReview: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Reviews")
                    .font(.headline)
                if viewModel.total > 0 {
                    Text("(\(viewModel.total))")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button {
                    showWriteReview = true
                } label: {
                    Label(
                        viewModel.userReview != nil ? "Edit review" : "Write review",
                        systemImage: "square.and.pencil"
                    )
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(theme.primary)
                }
                .buttonStyle(.plain)
            }

            if viewModel.reviews.isEmpty && !viewModel.isLoading {
                VStack(spacing: 8) {
                    Image(systemName: "star")
                        .font(.system(size: 30))
                        .foregroundStyle(.quaternary)
                    Text("No reviews yet")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text("Be the first to share your experience")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
            } else {
                ForEach(viewModel.reviews) { review in
                    ReviewCard(review: review)
                }

                if viewModel.hasMore {
                    Button {
                        Task { await viewModel.loadMore() }
                    } label: {
                        Text("Show more reviews")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(theme.primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

// MARK: - Review Card

struct ReviewCard: View {
    let review: PatternReview

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Author + date
            HStack(spacing: 8) {
                AvatarImage(url: review.user.avatarUrl, size: 28)

                VStack(alignment: .leading, spacing: 1) {
                    Text(review.user.displayName ?? review.user.username)
                        .font(.caption.weight(.semibold))
                    Text(review.createdAt, style: .date)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }

                Spacer()

                // Star rating
                StarRatingView(rating: review.rating, size: 12)
            }

            // Difficulty + would make again
            HStack(spacing: 12) {
                if let difficulty = review.difficultyRating {
                    HStack(spacing: 3) {
                        Image(systemName: "chart.bar")
                            .font(.caption2)
                        Text("Difficulty: \(String(format: "%.0f", difficulty))/5")
                            .font(.caption2)
                    }
                    .foregroundStyle(.secondary)
                }
                if let wouldMakeAgain = review.wouldMakeAgain {
                    HStack(spacing: 3) {
                        Image(systemName: wouldMakeAgain ? "arrow.counterclockwise" : "xmark")
                            .font(.caption2)
                        Text(wouldMakeAgain ? "Would make again" : "Wouldn't make again")
                            .font(.caption2)
                    }
                    .foregroundStyle(wouldMakeAgain ? .green : .secondary)
                }
            }

            // Review content
            if let content = review.content, !content.isEmpty {
                Text(content)
                    .font(.subheadline)
                    .foregroundStyle(.primary)
                    .lineLimit(6)
            }

            // Linked project
            if let project = review.project {
                HStack(spacing: 4) {
                    Image(systemName: "link")
                        .font(.caption2)
                    Text("from project: \(project.title)")
                        .font(.caption2)
                }
                .foregroundStyle(.tertiary)
            }
        }
        .padding(12)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Star Rating View

struct StarRatingView: View {
    let rating: Double
    var size: CGFloat = 14

    var body: some View {
        HStack(spacing: 1) {
            ForEach(1...5, id: \.self) { star in
                let fill = min(max(rating - Double(star - 1), 0), 1)
                Image(systemName: fill >= 0.75 ? "star.fill" : fill >= 0.25 ? "star.leadinghalf.filled" : "star")
                    .font(.system(size: size))
                    .foregroundStyle(fill > 0 ? Color(hex: "#FF6B6B") : Color.secondary.opacity(0.3))
            }
        }
    }
}

// MARK: - Interactive Star Picker

struct StarRatingPicker: View {
    @Binding var rating: Double
    var size: CGFloat = 28

    var body: some View {
        HStack(spacing: 4) {
            ForEach(1...5, id: \.self) { star in
                Image(systemName: rating >= Double(star) ? "star.fill" : rating >= Double(star) - 0.5 ? "star.leadinghalf.filled" : "star")
                    .font(.system(size: size))
                    .foregroundStyle(rating >= Double(star) - 0.5 ? Color(hex: "#FF6B6B") : Color.secondary.opacity(0.3))
                    .onTapGesture {
                        // Tap toggles between half and full star
                        if rating == Double(star) {
                            rating = Double(star) - 0.5
                        } else if rating == Double(star) - 0.5 {
                            rating = 0
                        } else {
                            rating = Double(star)
                        }
                    }
            }
        }
    }
}

// MARK: - Write Review Sheet

struct WriteReviewSheet: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.dismiss) private var dismiss
    let viewModel: PatternReviewsViewModel
    var onSave: (() -> Void)?

    @State private var rating: Double = 0
    @State private var difficultyRating: Double = 0
    @State private var content = ""
    @State private var wouldMakeAgain: Bool?
    @State private var isSaving = false
    @State private var showDeleteConfirm = false

    private var isEditing: Bool { viewModel.userReview != nil }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Rating
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Your rating")
                            .font(.subheadline.weight(.medium))
                        StarRatingPicker(rating: $rating)
                        Text("Tap a star for full, tap again for half")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }

                    // Difficulty
                    VStack(alignment: .leading, spacing: 8) {
                        Text("How difficult was it?")
                            .font(.subheadline.weight(.medium))
                        StarRatingPicker(rating: $difficultyRating, size: 22)
                        HStack {
                            Text("Easy")
                                .font(.caption2)
                                .foregroundStyle(.tertiary)
                            Spacer()
                            Text("Very hard")
                                .font(.caption2)
                                .foregroundStyle(.tertiary)
                        }
                    }

                    // Would make again
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Would you make this again?")
                            .font(.subheadline.weight(.medium))
                        HStack(spacing: 8) {
                            wouldMakeButton(true, label: "Yes", icon: "hand.thumbsup")
                            wouldMakeButton(false, label: "No", icon: "hand.thumbsdown")
                        }
                    }

                    // Written review
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Review (optional)")
                            .font(.subheadline.weight(.medium))
                        TextEditor(text: $content)
                            .frame(minHeight: 100)
                            .padding(8)
                            .background(Color(.secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        Text("\(content.count)/2000")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                            .frame(maxWidth: .infinity, alignment: .trailing)
                    }

                    // Delete button (if editing)
                    if isEditing {
                        Button("Delete review", role: .destructive) {
                            showDeleteConfirm = true
                        }
                        .font(.subheadline)
                    }
                }
                .padding()
            }
            .navigationTitle(isEditing ? "Edit review" : "Write review")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task { await save() }
                    }
                    .fontWeight(.semibold)
                    .disabled(rating == 0 || isSaving)
                }
            }
            .confirmationDialog("Delete review?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
                Button("Delete", role: .destructive) {
                    Task {
                        await viewModel.deleteReview()
                        onSave?()
                        dismiss()
                    }
                }
                Button("Cancel", role: .cancel) {}
            }
            .onAppear { populateFromExisting() }
        }
        .presentationDetents([.large])
    }

    private func wouldMakeButton(_ value: Bool, label: String, icon: String) -> some View {
        Button {
            wouldMakeAgain = wouldMakeAgain == value ? nil : value
        } label: {
            HStack(spacing: 6) {
                Image(systemName: icon)
                Text(label)
                    .fontWeight(.medium)
            }
            .font(.subheadline)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(
                wouldMakeAgain == value
                    ? (value ? Color.green.opacity(0.15) : Color.red.opacity(0.15))
                    : Color(.secondarySystemGroupedBackground),
                in: RoundedRectangle(cornerRadius: 10)
            )
            .foregroundStyle(wouldMakeAgain == value ? (value ? .green : .red) : .secondary)
        }
        .buttonStyle(.plain)
    }

    private func populateFromExisting() {
        guard let review = viewModel.userReview else { return }
        rating = review.rating
        difficultyRating = review.difficultyRating ?? 0
        content = review.content ?? ""
        wouldMakeAgain = review.wouldMakeAgain
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        await viewModel.submitReview(
            rating: rating,
            difficultyRating: difficultyRating > 0 ? difficultyRating : nil,
            content: content.trimmingCharacters(in: .whitespaces),
            wouldMakeAgain: wouldMakeAgain,
            projectId: nil
        )
        onSave?()
        dismiss()
    }
}
