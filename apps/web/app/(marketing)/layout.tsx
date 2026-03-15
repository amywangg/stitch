import Link from 'next/link'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border-default">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/" className="text-lg sm:text-xl font-bold text-coral-500">
            Stitch
          </Link>

          <div className="hidden sm:flex items-center gap-6 md:gap-8">
            <a href="#features" className="text-sm text-content-secondary hover:text-content-default transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm text-content-secondary hover:text-content-default transition-colors">
              Pricing
            </a>
            <a href="#download" className="text-sm text-content-secondary hover:text-content-default transition-colors">
              Download
            </a>
          </div>

          <a
            href="#download"
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-coral-500 text-white text-xs sm:text-sm font-semibold rounded-full hover:bg-coral-600 transition-colors"
          >
            Get the app
          </a>
        </nav>
      </header>

      {children}

      <footer className="border-t border-border-default bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6">
              <Link href="/" className="text-lg font-bold text-coral-500">
                Stitch
              </Link>
              <span className="text-xs sm:text-sm text-content-tertiary">The modern knitting companion</span>
            </div>

            <div className="flex items-center gap-5 sm:gap-6 text-xs sm:text-sm text-content-secondary">
              <a href="#" className="hover:text-content-default transition-colors">Privacy</a>
              <a href="#" className="hover:text-content-default transition-colors">Terms</a>
              <a href="#" className="hover:text-content-default transition-colors">Support</a>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-border-default flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-content-tertiary">
              &copy; {new Date().getFullYear()} Stitch. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-content-tertiary">
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#download">Download</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
