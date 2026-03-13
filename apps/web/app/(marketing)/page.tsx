import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <h1 className="text-5xl font-bold text-content-default">
          <span className="text-coral-500">Stitch</span>
        </h1>
        <p className="text-xl text-content-secondary">
          Your knitting companion. Track projects, import patterns, and connect with fellow knitters.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/sign-up"
            className="px-6 py-3 bg-coral-500 text-white rounded-xl font-semibold hover:bg-coral-600 transition-colors"
          >
            Get started free
          </Link>
          <Link
            href="/sign-in"
            className="px-6 py-3 bg-surface border border-border-default text-content-default rounded-xl font-semibold hover:bg-background-muted transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  )
}
