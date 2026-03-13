import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-content-default">Dashboard</h1>
      <p className="text-content-secondary">Welcome back! Your projects will appear here.</p>
    </div>
  )
}
