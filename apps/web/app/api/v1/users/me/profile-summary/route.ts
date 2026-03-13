import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth'

export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getDbUser(clerkId)

  // Parallel queries for all profile data
  const [
    counts,
    recentProjects,
    completedProjects,
    stashSummary,
    recentActivity,
    craftingStats,
    ravelryConnection,
    recentReviews,
    queueItems,
    savedPatterns,
    needleSummary,
  ] = await Promise.all([
    // Counts
    prisma.users.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        subscription: { select: { plan: true, status: true } },
        _count: {
          select: {
            projects: { where: { deleted_at: null } },
            followers: true,
            following: true,
            stash: true,
            needles: true,
            pattern_reviews: true,
            saved_patterns: true,
            pattern_queue: true,
          },
        },
      },
    }),

    // Recent projects (last 6, with first photo)
    prisma.projects.findMany({
      where: { user_id: user.id, deleted_at: null },
      orderBy: { updated_at: 'desc' },
      take: 6,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        craft_type: true,
        photos: { orderBy: { sort_order: 'asc' }, take: 1, select: { url: true } },
        sections: {
          select: { current_row: true, target_rows: true },
          orderBy: { sort_order: 'asc' },
          take: 1,
        },
      },
    }),

    // Completed projects count
    prisma.projects.count({
      where: { user_id: user.id, deleted_at: null, status: 'completed' },
    }),

    // Stash summary: group by yarn weight
    prisma.user_stash.findMany({
      where: { user_id: user.id, status: 'in_stash' },
      select: { skeins: true, yarn: { select: { weight: true } } },
    }),

    // Recent activity (last 5)
    prisma.activity_events.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
      take: 5,
      include: {
        project: { select: { id: true, title: true, slug: true } },
        pattern: { select: { id: true, title: true, slug: true } },
      },
    }),

    // Crafting sessions: last 52 weeks of data for heatmap
    prisma.crafting_sessions.groupBy({
      by: ['date'],
      where: {
        user_id: user.id,
        date: { gte: new Date(Date.now() - 52 * 7 * 24 * 60 * 60 * 1000) },
      },
      _sum: { duration_minutes: true },
      orderBy: { date: 'asc' },
    }),

    // Ravelry connection status
    prisma.ravelry_connections.findUnique({
      where: { user_id: user.id },
      select: { ravelry_username: true, synced_at: true, import_status: true },
    }),

    // Recent reviews (last 3, with pattern info)
    prisma.pattern_reviews.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
      take: 3,
      select: {
        id: true,
        rating: true,
        difficulty_rating: true,
        content: true,
        would_make_again: true,
        created_at: true,
        pattern: {
          select: {
            id: true,
            title: true,
            slug: true,
            cover_image_url: true,
            designer_name: true,
          },
        },
      },
    }),

    // Queue (last 4, with pattern cover)
    prisma.pattern_queue.findMany({
      where: { user_id: user.id },
      orderBy: { sort_order: 'asc' },
      take: 4,
      select: {
        id: true,
        pattern: {
          select: {
            id: true,
            title: true,
            slug: true,
            cover_image_url: true,
            designer_name: true,
          },
        },
      },
    }),

    // Saved patterns (last 4, with cover)
    prisma.saved_patterns.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
      take: 4,
      select: {
        id: true,
        name: true,
        photo_url: true,
        designer: true,
        permalink: true,
      },
    }),

    // Needles summary: group by type
    prisma.user_needles.groupBy({
      by: ['type'],
      where: { user_id: user.id },
      _count: true,
    }),
  ])

  // Compute stash weight breakdown
  const weightBreakdown: Record<string, { skeins: number; count: number }> = {}
  let totalSkeins = 0
  for (const item of stashSummary) {
    const weight = item.yarn?.weight ?? 'unknown'
    if (!weightBreakdown[weight]) weightBreakdown[weight] = { skeins: 0, count: 0 }
    weightBreakdown[weight].skeins += item.skeins
    weightBreakdown[weight].count += 1
    totalSkeins += item.skeins
  }

  // Compute heatmap data (date → minutes)
  const heatmap = craftingStats.map((day) => ({
    date: day.date.toISOString().slice(0, 10),
    minutes: day._sum.duration_minutes ?? 0,
  }))

  // Compute total crafting time this year
  const thisYear = new Date().getFullYear()
  const totalMinutesThisYear = craftingStats
    .filter((d) => d.date.getFullYear() === thisYear)
    .reduce((sum, d) => sum + (d._sum.duration_minutes ?? 0), 0)

  // Needle type breakdown
  const needleBreakdown: Record<string, number> = {}
  for (const group of needleSummary) {
    needleBreakdown[group.type] = group._count
  }

  const memberSince = user.created_at
  const activeProjects = recentProjects.filter((p) => p.status === 'active').length

  return NextResponse.json({
    success: true,
    data: {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        location: user.location,
        website: user.website,
        craftPreference: user.craft_preference,
        experienceLevel: user.experience_level,
        isPro: user.is_pro,
        memberSince,
      },
      stats: {
        projects: counts._count.projects,
        activeProjects,
        completedProjects,
        followers: counts._count.followers,
        following: counts._count.following,
        stashItems: counts._count.stash,
        needles: counts._count.needles,
        reviews: counts._count.pattern_reviews,
        savedPatterns: counts._count.saved_patterns,
        queueItems: counts._count.pattern_queue,
        totalSkeins: Math.round(totalSkeins * 10) / 10,
        totalCraftingMinutesThisYear: totalMinutesThisYear,
      },
      recentProjects,
      stashBreakdown: weightBreakdown,
      recentActivity,
      heatmap,
      recentReviews,
      queuePreview: queueItems,
      savedPatternsPreview: savedPatterns,
      needleBreakdown,
      ravelry: ravelryConnection,
      subscription: counts.subscription,
    },
  })
}
