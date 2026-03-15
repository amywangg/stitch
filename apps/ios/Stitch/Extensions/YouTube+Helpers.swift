import Foundation

enum YouTubeHelpers {
    /// Extracts an 11-character YouTube video ID from various URL formats:
    /// - youtube.com/watch?v=ID
    /// - youtu.be/ID
    /// - youtube.com/shorts/ID
    /// - youtube.com/embed/ID
    static func extractVideoID(from urlString: String) -> String? {
        // Direct ID (11 chars, no URL structure)
        if urlString.count == 11, urlString.range(of: "^[a-zA-Z0-9_-]{11}$", options: .regularExpression) != nil {
            return urlString
        }

        guard let url = URL(string: urlString) else { return nil }
        let host = url.host?.lowercased() ?? ""

        // youtu.be/ID
        if host == "youtu.be" {
            let id = url.pathComponents.dropFirst().first
            return id?.count == 11 ? id : nil
        }

        // youtube.com or youtube-nocookie.com
        guard host.contains("youtube") else { return nil }
        let path = url.path

        // /watch?v=ID
        if path == "/watch" || path.hasPrefix("/watch") {
            let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
            return components?.queryItems?.first(where: { $0.name == "v" })?.value
        }

        // /shorts/ID or /embed/ID
        let patterns = ["/shorts/", "/embed/"]
        for pattern in patterns {
            if path.hasPrefix(pattern) {
                let id = String(path.dropFirst(pattern.count)).components(separatedBy: "/").first
                return id?.count == 11 ? id : nil
            }
        }

        return nil
    }

    enum ThumbnailQuality: String {
        case `default` = "default"        // 120x90
        case medium = "mqdefault"          // 320x180
        case high = "hqdefault"            // 480x360
        case maxres = "maxresdefault"      // 1280x720 (may not exist)
    }

    /// Returns the thumbnail URL for a YouTube video.
    static func thumbnailURL(videoID: String, quality: ThumbnailQuality = .high) -> URL {
        URL(string: "https://img.youtube.com/vi/\(videoID)/\(quality.rawValue).jpg")!
    }

    /// Generates a self-contained HTML string for the YouTube IFrame Player.
    /// Supports start/end timestamps and error detection via webkit message handler.
    static func embedHTML(
        videoID: String,
        startSeconds: Int? = nil,
        endSeconds: Int? = nil,
        isShort: Bool = false
    ) -> String {
        var params = [
            "playsinline=1",
            "rel=0",
            "modestbranding=1",
            "controls=1",
            "fs=1",
        ]
        if let start = startSeconds { params.append("start=\(start)") }
        if let end = endSeconds { params.append("end=\(end)") }

        let paramString = params.joined(separator: "&")
        let embedURL = "https://www.youtube.com/embed/\(videoID)?\(paramString)&enablejsapi=1&origin=https://www.youtube.com"

        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
                .container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                iframe {
                    width: 100%;
                    height: 100%;
                    border: none;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <iframe
                    id="player"
                    src="\(embedURL)"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen>
                </iframe>
            </div>
            <script>
                window.addEventListener('message', function(event) {
                    try {
                        var data = JSON.parse(event.data);
                        if (data.event === 'onError') {
                            window.webkit.messageHandlers.youtubeError.postMessage(
                                JSON.stringify({ error: data.info })
                            );
                        }
                    } catch(e) {}
                });
            </script>
        </body>
        </html>
        """
    }
}
