'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { LayoutDashboard, FolderOpen, BookOpen, Users, User, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/patterns', label: 'Patterns', icon: BookOpen },
  { href: '/feed', label: 'Feed', icon: Users },
  { href: '/profile', label: 'Profile', icon: User },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header (desktop) */}
      <header className="hidden md:flex h-14 items-center border-b border-border-default px-4 gap-4 bg-surface">
        <Link href="/dashboard" className="font-bold text-lg text-coral-500">
          Stitch
        </Link>
        <nav className="flex gap-2 ml-4">
          {NAV_ITEMS.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                pathname.startsWith(item.href)
                  ? 'bg-coral-500 text-white'
                  : 'text-content-secondary hover:text-content-default hover:bg-background-muted'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/profile"
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith('/profile')
                ? 'bg-coral-500 text-white'
                : 'text-content-secondary hover:text-content-default hover:bg-background-muted'
            )}
          >
            Profile
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-surface border-t border-border-default flex">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs font-medium transition-colors',
                active ? 'text-coral-500' : 'text-content-tertiary'
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
