import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export class UserController {
  async checkUsername(req: Request, res: Response) {
    const { username } = req.params;

    // Validate format
    if (!username || username.length < 3 || username.length > 30) {
      return res.json({
        success: true,
        data: { available: false },
      });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.json({
        success: true,
        data: { available: false },
      });
    }

    // Reserved usernames
    const reserved = ['admin', 'root', 'system', 'stitch', 'support', 'help', 'mod', 'moderator'];
    if (reserved.includes(username.toLowerCase())) {
      return res.json({
        success: true,
        data: { available: false },
      });
    }

    // Check if username exists
    const existingUser = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    res.json({
      success: true,
      data: { available: !existingUser },
    });
  }

  async getByUsername(req: Request, res: Response) {
    const { username } = req.params;
    const currentUserId = req.user?.id;

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        stats: true,
        designerProfile: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new AppError('User not found', 404);
    }

    // Check if current user is following
    let isFollowing = false;
    if (currentUserId) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: user.id,
          },
        },
      });
      isFollowing = !!follow;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        coverImageUrl: user.coverImageUrl,
        websiteUrl: user.websiteUrl,
        location: user.location,
        isVerified: user.isVerified,
        isDesigner: user.isDesigner,
        stats: user.stats,
        designerProfile: user.isDesigner ? user.designerProfile : null,
        isFollowing,
        createdAt: user.createdAt,
      },
    });
  }

  async updateProfile(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errors.array()[0].msg, 400);
    }

    const userId = req.user!.id;
    const { displayName, bio, location, websiteUrl, avatarUrl, coverImageUrl } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        displayName,
        bio,
        location,
        websiteUrl: websiteUrl || null,
        avatarUrl,
        coverImageUrl,
      },
    });

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        coverImageUrl: user.coverImageUrl,
        websiteUrl: user.websiteUrl,
        location: user.location,
      },
    });
  }

  async updateSettings(req: Request, res: Response) {
    const userId = req.user!.id;
    const {
      emailNotifications,
      pushNotifications,
      newsletterSubscribed,
      showOnlineStatus,
      allowMessagesFrom,
      defaultProjectVisibility,
      preferredUnit,
    } = req.body;

    // Update user settings
    const settings = await prisma.userSettings.update({
      where: { userId },
      data: {
        emailNotifications,
        pushNotifications,
        newsletterSubscribed,
        showOnlineStatus,
        allowMessagesFrom,
        defaultProjectVisibility,
      },
    });

    // Update preferred unit on user
    if (preferredUnit) {
      await prisma.user.update({
        where: { id: userId },
        data: { preferredUnit },
      });
    }

    res.json({
      success: true,
      data: settings,
    });
  }

  async getUserProjects(req: Request, res: Response) {
    const { username } = req.params;
    const currentUserId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Determine visibility based on relationship
    const visibilityFilter: any[] = [{ visibility: 'public' }];

    if (currentUserId === user.id) {
      // Own profile - show all
      visibilityFilter.push({ visibility: 'private' }, { visibility: 'followers' });
    } else if (currentUserId) {
      // Check if following
      const isFollowing = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: user.id,
          },
        },
      });
      if (isFollowing) {
        visibilityFilter.push({ visibility: 'followers' });
      }
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
          OR: visibilityFilter,
        },
        include: {
          pattern: { select: { title: true, slug: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.project.count({
        where: {
          userId: user.id,
          deletedAt: null,
          OR: visibilityFilter,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        items: projects,
        total,
        page,
        pageSize: limit,
        hasMore: total > page * limit,
      },
    });
  }

  async getUserPatterns(req: Request, res: Response) {
    const { username } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const [patterns, total] = await Promise.all([
      prisma.pattern.findMany({
        where: {
          authorId: user.id,
          isPublished: true,
          deletedAt: null,
        },
        include: {
          listing: { select: { price: true, currency: true } },
          _count: { select: { favorites: true, projects: true } },
        },
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.pattern.count({
        where: {
          authorId: user.id,
          isPublished: true,
          deletedAt: null,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        items: patterns,
        total,
        page,
        pageSize: limit,
        hasMore: total > page * limit,
      },
    });
  }

  async getFollowers(req: Request, res: Response) {
    const { username } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const [followers, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: user.id },
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              bio: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.follow.count({ where: { followingId: user.id } }),
    ]);

    res.json({
      success: true,
      data: {
        items: followers.map((f) => f.follower),
        total,
        page,
        pageSize: limit,
        hasMore: total > page * limit,
      },
    });
  }

  async getFollowing(req: Request, res: Response) {
    const { username } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const [following, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: user.id },
        include: {
          following: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              bio: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.follow.count({ where: { followerId: user.id } }),
    ]);

    res.json({
      success: true,
      data: {
        items: following.map((f) => f.following),
        total,
        page,
        pageSize: limit,
        hasMore: total > page * limit,
      },
    });
  }
}

