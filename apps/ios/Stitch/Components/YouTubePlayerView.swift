import SwiftUI
import WebKit

/// WKWebView wrapper that plays YouTube videos by loading the YouTube watch page directly.
/// This avoids iframe embed restrictions that cause Error 153 in WKWebView.
struct YouTubePlayerView: UIViewRepresentable {
    let videoID: String
    var startSeconds: Int? = nil
    var isShort: Bool = false

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.navigationDelegate = context.coordinator

        let urlString: String
        if isShort {
            urlString = "https://www.youtube.com/shorts/\(videoID)"
        } else if let start = startSeconds, start > 0 {
            urlString = "https://www.youtube.com/watch?v=\(videoID)&t=\(start)"
        } else {
            urlString = "https://www.youtube.com/watch?v=\(videoID)"
        }

        if let url = URL(string: urlString) {
            webView.load(URLRequest(url: url))
        }

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    // MARK: - Coordinator

    final class Coordinator: NSObject, WKNavigationDelegate {
        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url,
                  let host = url.host?.lowercased() else {
                decisionHandler(.allow)
                return
            }

            // Allow YouTube and Google domains (needed for auth, consent screens, etc.)
            if host.contains("youtube") || host.contains("youtu.be") || host.contains("google") || host.contains("gstatic") {
                decisionHandler(.allow)
            } else {
                // Open external links in Safari
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
            }
        }
    }
}
