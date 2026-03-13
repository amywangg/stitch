import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import PatternDiscovery from '@/components/features/discover/PatternDiscovery'

export default async function DiscoverPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <PatternDiscovery />
    </div>
  )
}
