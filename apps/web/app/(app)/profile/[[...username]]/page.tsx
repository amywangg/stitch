import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'
import ProfileView from '@/components/features/profile/ProfileView'

export default async function ProfilePage({ params }: { params: Promise<{ username?: string[] }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const currentUser = await getDbUser(clerkId)
  const { username } = await params
  const targetUsername = username?.[0]
  const isOwnProfile = !targetUsername || targetUsername === currentUser.username

  const targetUser = isOwnProfile
    ? currentUser
    : await prisma.users.findUnique({ where: { username: targetUsername } })

  if (!targetUser) redirect('/profile')

  // Fetch all profile data in parallel
  const [
    stats,
    recentProjects,
    ravelryConnection,
    followers,
    following,
    savedPatterns,
    reviews,
  ] = await Promise.all([
    prisma.$transaction([
      prisma.projects.count({ where: { user_id: targetUser.id, deleted_at: null } }),
      prisma.projects.count({ where: { user_id: targetUser.id, deleted_at: null, status: 'completed' } }),
      prisma.patterns.count({ where: { user_id: targetUser.id, deleted_at: null } }),
      prisma.follows.count({ where: { following_id: targetUser.id } }),
      prisma.follows.count({ where: { follower_id: targetUser.id } }),
      prisma.user_stash.count({ where: { user_id: targetUser.id } }),
      prisma.saved_patterns.count({ where: { user_id: targetUser.id } }),
      prisma.pattern_reviews.count({ where: { user_id: targetUser.id } }),
    ]),
    prisma.projects.findMany({
      where: { user_id: targetUser.id, deleted_at: null },
      orderBy: { updated_at: 'desc' },
      take: 6,
      include: { photos: { take: 1, orderBy: { sort_order: 'asc' } } },
    }),
    isOwnProfile
      ? prisma.ravelry_connections.findUnique({
          where: { user_id: targetUser.id },
          select: { ravelry_username: true, synced_at: true },
        })
      : null,
    prisma.follows.count({ where: { following_id: targetUser.id } }),
    prisma.follows.count({ where: { follower_id: targetUser.id } }),
    prisma.saved_patterns.findMany({
      where: { user_id: targetUser.id },
      orderBy: { created_at: 'desc' },
      take: 6,
    }),
    prisma.pattern_reviews.findMany({
      where: { user_id: targetUser.id },
      orderBy: { created_at: 'desc' },
      take: 5,
      include: { pattern: { select: { title: true, slug: true } } },
    }),
  ])

  const [projectCount, completedCount, patternCount, followerCount, followingCount, stashCount, savedCount, reviewCount] = stats

  // Check if current user follows this user
  let isFollowing = false
  if (!isOwnProfile) {
    const follow = await prisma.follows.findUnique({
      where: { follower_id_following_id: { follower_id: currentUser.id, following_id: targetUser.id } },
    })
    isFollowing = !!follow
  }

  return (
    <ProfileView
      user={{
        id: targetUser.id,
        username: targetUser.username,
        display_name: targetUser.display_name,
        avatar_url: targetUser.avatar_url,
        bio: targetUser.bio,
        location: targetUser.location,
        website: targetUser.website,
        craft_preference: targetUser.craft_preference,
        experience_level: targetUser.experience_level,
        is_pro: targetUser.is_pro,
        created_at: targetUser.created_at.toISOString(),
      }}
      stats={{
        projects: projectCount,
        completed: completedCount,
        patterns: patternCount,
        followers: followerCount,
        following: followingCount,
        stash: stashCount,
        saved_patterns: savedCount,
        reviews: reviewCount,
      }}
      recentProjects={recentProjects.map(p => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        status: p.status,
        photo_url: p.photos[0]?.url ?? null,
      }))}
      savedPatterns={savedPatterns.map(p => ({
        id: p.id,
        name: p.name,
        permalink: p.permalink,
        designer: p.designer,
        photo_url: p.photo_url,
        weight: p.weight,
      }))}
      reviews={reviews.map(r => ({
        id: r.id,
        rating: r.rating,
        content: r.content,
        pattern_title: r.pattern.title,
        pattern_slug: r.pattern.slug,
        created_at: r.created_at.toISOString(),
      }))}
      ravelryUsername={ravelryConnection?.ravelry_username ?? null}
      isOwnProfile={isOwnProfile}
      isFollowing={isFollowing}
    />
  )
}
