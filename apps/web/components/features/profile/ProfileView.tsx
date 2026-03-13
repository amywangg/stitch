'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import {
  Settings, MapPin, Globe, ExternalLink, Calendar,
  Star, ChevronRight, UserPlus, UserMinus, Crown,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProfileUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  location: string | null
  website: string | null
  craft_preference: string
  experience_level: string | null
  is_pro: boolean
  created_at: string
}

interface ProfileStats {
  projects: number
  completed: number
  patterns: number
  followers: number
  following: number
  stash: number
  saved_patterns: number
  reviews: number
}

interface RecentProject {
  id: string
  slug: string
  title: string
  status: string
  photo_url: string | null
}

interface SavedPattern {
  id: string
  name: string
  permalink: string
  designer: string | null
  photo_url: string | null
  weight: string | null
}

interface Review {
  id: string
  rating: number
  content: string | null
  pattern_title: string
  pattern_slug: string
  created_at: string
}

interface ProfileViewProps {
  user: ProfileUser
  stats: ProfileStats
  recentProjects: RecentProject[]
  savedPatterns: SavedPattern[]
  reviews: Review[]
  ravelryUsername: string | null
  isOwnProfile: boolean
  isFollowing: boolean
}

type Tab = 'projects' | 'patterns' | 'reviews'

// ─── Component ──────────────────────────────────────────────────────────────

export default function ProfileView({
  user,
  stats,
  recentProjects,
  savedPatterns,
  reviews,
  ravelryUsername,
  isOwnProfile,
  isFollowing: initialIsFollowing,
}: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('projects')
  const [following, setFollowing] = useState(initialIsFollowing)
  const [followerCount, setFollowerCount] = useState(stats.followers)
  const [followLoading, setFollowLoading] = useState(false)

  const toggleFollow = async () => {
    setFollowLoading(true)
    try {
      if (following) {
        await api.delete(`/social/follow/${user.id}`)
        setFollowerCount(c => c - 1)
      } else {
        await api.post(`/social/follow/${user.id}`)
        setFollowerCount(c => c + 1)
      }
      setFollowing(!following)
    } catch {} finally {
      setFollowLoading(false)
    }
  }

  const craftLabel = user.craft_preference === 'both'
    ? 'Knitter & Crocheter'
    : user.craft_preference === 'crochet' ? 'Crocheter' : 'Knitter'

  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.display_name ?? user.username}
              className="w-20 h-20 rounded-full object-cover border-2 border-border-default"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-coral-500/10 flex items-center justify-center text-3xl font-bold text-coral-500">
              {(user.display_name ?? user.username)[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-content-default truncate">
              {user.display_name ?? user.username}
            </h1>
            {user.is_pro && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-coral-500/10 text-coral-500 text-xs font-medium">
                <Crown className="w-3 h-3" /> Pro
              </span>
            )}
          </div>
          <p className="text-sm text-content-secondary">@{user.username}</p>
          <p className="text-sm text-content-secondary mt-0.5">{craftLabel}</p>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0">
          {isOwnProfile ? (
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border-default text-sm font-medium text-content-default hover:border-coral-500 transition-all"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          ) : (
            <button
              onClick={toggleFollow}
              disabled={followLoading}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                following
                  ? 'bg-surface border border-border-default text-content-default hover:border-red-400 hover:text-red-500'
                  : 'bg-coral-500 text-white hover:bg-coral-600',
              )}
            >
              {following ? (
                <><UserMinus className="w-4 h-4" /> Following</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Follow</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Bio + details ─────────────────────────────────────────────── */}
      {(user.bio || user.location || user.website || ravelryUsername) && (
        <div className="space-y-2">
          {user.bio && <p className="text-sm text-content-default">{user.bio}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-content-secondary">
            {user.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {user.location}
              </span>
            )}
            {user.website && (
              <a href={user.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-coral-500">
                <Globe className="w-3.5 h-3.5" /> {user.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            {ravelryUsername && (
              <a
                href={`https://www.ravelry.com/people/${ravelryUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-coral-500"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Ravelry
              </a>
            )}
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Joined {memberSince}
            </span>
          </div>
        </div>
      )}

      {/* ── Stats grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        <StatBox label="Projects" value={stats.projects} href={isOwnProfile ? '/projects' : undefined} />
        <StatBox label="Completed" value={stats.completed} />
        <StatBox label="Followers" value={followerCount} />
        <StatBox label="Following" value={stats.following} />
      </div>
      <div className="grid grid-cols-4 gap-3">
        <StatBox label="Stash" value={stats.stash} />
        <StatBox label="Patterns" value={stats.patterns} href={isOwnProfile ? '/patterns' : undefined} />
        <StatBox label="Saved" value={stats.saved_patterns} href={isOwnProfile ? '/discover' : undefined} />
        <StatBox label="Reviews" value={stats.reviews} />
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex border-b border-border-default">
        {(['projects', 'patterns', 'reviews'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors capitalize',
              activeTab === tab
                ? 'border-coral-500 text-coral-500'
                : 'border-transparent text-content-secondary hover:text-content-default',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab content ───────────────────────────────────────────────── */}
      {activeTab === 'projects' && (
        <div className="space-y-3">
          {recentProjects.length === 0 ? (
            <EmptyState message="No projects yet" />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {recentProjects.map(project => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.slug}`}
                    className="group rounded-xl bg-surface border border-border-default overflow-hidden hover:border-coral-500/50 transition-all"
                  >
                    {project.photo_url ? (
                      <div className="aspect-square bg-background-muted overflow-hidden">
                        <img src={project.photo_url} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    ) : (
                      <div className="aspect-square bg-background-muted flex items-center justify-center">
                        <span className="text-3xl">🧶</span>
                      </div>
                    )}
                    <div className="p-2">
                      <p className="text-sm font-medium text-content-default truncate">{project.title}</p>
                      <p className="text-xs text-content-tertiary capitalize">{project.status}</p>
                    </div>
                  </Link>
                ))}
              </div>
              {stats.projects > 6 && (
                <Link href="/projects" className="flex items-center justify-center gap-1 py-2 text-sm text-coral-500 hover:underline">
                  View all {stats.projects} projects <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'patterns' && (
        <div className="space-y-3">
          {savedPatterns.length === 0 ? (
            <EmptyState message="No saved patterns yet" action={{ label: 'Discover patterns', href: '/discover' }} />
          ) : (
            <div className="space-y-2">
              {savedPatterns.map(pattern => (
                <a
                  key={pattern.id}
                  href={`https://www.ravelry.com/patterns/library/${pattern.permalink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border-default hover:border-coral-500/50 transition-all"
                >
                  {pattern.photo_url ? (
                    <img src={pattern.photo_url} alt={pattern.name} className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-background-muted flex items-center justify-center">
                      <span className="text-lg">📄</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-content-default truncate">{pattern.name}</p>
                    <p className="text-xs text-content-secondary">
                      {[pattern.designer, pattern.weight].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-content-tertiary flex-shrink-0" />
                </a>
              ))}
              {stats.saved_patterns > 6 && (
                <Link href="/discover" className="flex items-center justify-center gap-1 py-2 text-sm text-coral-500 hover:underline">
                  View all saved patterns <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="space-y-3">
          {reviews.length === 0 ? (
            <EmptyState message="No reviews yet" />
          ) : (
            <div className="space-y-3">
              {reviews.map(review => (
                <div
                  key={review.id}
                  className="p-4 rounded-xl bg-surface border border-border-default space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-content-default">{review.pattern_title}</p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'w-3.5 h-3.5',
                            i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-content-tertiary',
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  {review.content && (
                    <p className="text-sm text-content-secondary">{review.content}</p>
                  )}
                  <p className="text-xs text-content-tertiary">
                    {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function StatBox({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <div className={cn(
      'flex flex-col items-center py-3 rounded-xl bg-surface border border-border-default',
      href && 'hover:border-coral-500/50 transition-all cursor-pointer',
    )}>
      <span className="text-lg font-bold text-content-default">{value}</span>
      <span className="text-xs text-content-secondary">{label}</span>
    </div>
  )

  return href ? <Link href={href}>{inner}</Link> : inner
}

function EmptyState({ message, action }: { message: string; action?: { label: string; href: string } }) {
  return (
    <div className="text-center py-12 space-y-3">
      <p className="text-content-secondary">{message}</p>
      {action && (
        <Link href={action.href} className="inline-block px-4 py-2 rounded-lg bg-coral-500 text-white text-sm font-medium hover:bg-coral-600 transition-colors">
          {action.label}
        </Link>
      )}
    </div>
  )
}
