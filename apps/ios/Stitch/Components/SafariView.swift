import SafariServices
import SwiftUI

/// Reusable wrapper for SFSafariViewController.
/// Used for Stripe Connect onboarding, marketplace checkout, and external links.
struct SafariView: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> SFSafariViewController {
        SFSafariViewController(url: url)
    }

    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
}
