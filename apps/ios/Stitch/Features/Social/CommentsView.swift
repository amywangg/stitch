import SwiftUI

// MARK: - Comments View Model

@Observable
final class CommentsViewModel: Identifiable {
    let id = UUID()
    let postId: String?
    let activityEventId: String?

    var comments: [Comment] = []
    var isLoading = false
    var isSending = false
    var newComment = ""
    var error: String?

    init(postId: String? = nil, activityEventId: String? = nil) {
        self.postId = postId
        self.activityEventId = activityEventId
    }

    private var queryParam: String {
        if let postId { return "postId=\(postId)" }
        if let activityEventId { return "activityEventId=\(activityEventId)" }
        return ""
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: APIResponse<PaginatedData<Comment>> = try await APIClient.shared.get(
                "/social/comments?\(queryParam)&limit=50"
            )
            comments = response.data.items
        } catch {
            self.error = error.localizedDescription
        }
    }

    func send() async {
        let text = newComment.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        isSending = true
        defer { isSending = false }

        struct Body: Encodable {
            let content: String
            let postId: String?
            let activityEventId: String?
        }

        do {
            let response: APIResponse<Comment> = try await APIClient.shared.post(
                "/social/comments",
                body: Body(content: text, postId: postId, activityEventId: activityEventId)
            )
            comments.append(response.data)
            newComment = ""
        } catch let apiError as APIError {
            if apiError.errorCode == "PRO_REQUIRED" {
                self.error = "Commenting is a Pro feature."
            } else {
                self.error = apiError.localizedDescription
            }
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - Comments View

struct CommentsView: View {
    @State var viewModel: CommentsViewModel
    @Environment(ThemeManager.self) private var theme
    @FocusState private var isInputFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Comments list
                if viewModel.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.comments.isEmpty {
                    ContentUnavailableView(
                        "No comments yet",
                        systemImage: "bubble.right",
                        description: Text("Be the first to comment.")
                    )
                } else {
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 16) {
                            ForEach(viewModel.comments) { comment in
                                commentRow(comment)
                            }
                        }
                        .padding()
                    }
                }

                Divider()

                // Input bar
                HStack(spacing: 10) {
                    TextField("Add a comment...", text: $viewModel.newComment, axis: .vertical)
                        .textFieldStyle(.plain)
                        .lineLimit(1...4)
                        .focused($isInputFocused)

                    Button {
                        Task { await viewModel.send() }
                    } label: {
                        if viewModel.isSending {
                            ProgressView()
                                .controlSize(.small)
                        } else {
                            Image(systemName: "arrow.up.circle.fill")
                                .font(.title2)
                                .foregroundStyle(
                                    viewModel.newComment.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                                        ? Color(.systemGray4)
                                        : theme.primary
                                )
                        }
                    }
                    .disabled(viewModel.newComment.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || viewModel.isSending)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Color(.systemBackground))
            }
            .navigationTitle("Comments")
            .navigationBarTitleDisplayMode(.inline)
        }
        .task { await viewModel.load() }
        .errorAlert(error: $viewModel.error)
        .onAppear { isInputFocused = false }
    }

    private func commentRow(_ comment: Comment) -> some View {
        HStack(alignment: .top, spacing: 10) {
            AvatarImage(url: comment.user.avatarUrl, size: 32)

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(comment.user.displayName ?? comment.user.username)
                        .font(.subheadline.weight(.semibold))
                    Text(comment.createdAt, style: .relative)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }

                Text(comment.content)
                    .font(.subheadline)
            }
        }
    }
}
