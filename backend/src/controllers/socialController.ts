import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { io } from '../index.js';

export class SocialController {
  // ============================================================================
  // FEED
  // ============================================================================

  async getFeed(req: Request, res: Response) {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Get users this user follows
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);
    followingIds.push(userId); // Include own posts

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: {
          userId: { in: followingIds },
          deletedAt: null,
          OR: [
            { visibility: 'public' },
            { visibility: 'followers' },
          ],
        },
        include: {
          user: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
          project: {
            select: { id: true, title: true, coverImageUrl: true },
          },
          images: { orderBy: { displayOrder: 'asc' } },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.post.count({
        where: {
          userId: { in: followingIds },
          deletedAt: null,
        },
      }),
    ]);

    // Check which posts user has liked
    const likedPosts = await prisma.like.findMany({
      where: {
        userId,
        postId: { in: posts.map((p) => p.id) },
      },
      select: { postId: true },
    });
    const likedPostIds = new Set(likedPosts.map((l) => l.postId));

    const postsWithLikeStatus = posts.map((post) => ({
      ...post,
      isLiked: likedPostIds.has(post.id),
    }));

    res.json({
      success: true,
      data: {
        items: postsWithLikeStatus,
        total,
        page,
        pageSize: limit,
        hasMore: total > page * limit,
      },
    });
  }

  async getDiscover(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const posts = await prisma.post.findMany({
      where: {
        visibility: 'public',
        deletedAt: null,
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        project: {
          select: { id: true, title: true, coverImageUrl: true },
        },
        images: { orderBy: { displayOrder: 'asc' } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: [{ likeCount: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    });

    res.json({
      success: true,
      data: { items: posts },
    });
  }

  // ============================================================================
  // POSTS
  // ============================================================================

  async createPost(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errors.array()[0].msg, 400);
    }

    const userId = req.user!.id;
    const { content, projectId, visibility, imageUrls } = req.body;

    const post = await prisma.post.create({
      data: {
        userId,
        projectId,
        content,
        visibility: visibility || 'public',
        images: imageUrls
          ? {
              create: imageUrls.map((url: string, i: number) => ({
                imageUrl: url,
                displayOrder: i,
              })),
            }
          : undefined,
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        images: true,
      },
    });

    // Update user stats
    await prisma.userStats.update({
      where: { userId },
      data: { postCount: { increment: 1 } },
    });

    res.status(201).json({
      success: true,
      data: post,
    });
  }

  async getPost(req: Request, res: Response) {
    const { id } = req.params;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        project: true,
        images: { orderBy: { displayOrder: 'asc' } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    if (!post || post.deletedAt) {
      throw new AppError('Post not found', 404);
    }

    res.json({
      success: true,
      data: post,
    });
  }

  async updatePost(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;

    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post || post.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    const { content, visibility } = req.body;

    const updated = await prisma.post.update({
      where: { id },
      data: { content, visibility },
    });

    res.json({
      success: true,
      data: updated,
    });
  }

  async deletePost(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;

    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post || post.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    await prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({
      success: true,
      message: 'Post deleted',
    });
  }

  // ============================================================================
  // LIKES
  // ============================================================================

  async togglePostLike(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId: id } },
    });

    if (existing) {
      await prisma.like.delete({
        where: { userId_postId: { userId, postId: id } },
      });
      await prisma.post.update({
        where: { id },
        data: { likeCount: { decrement: 1 } },
      });

      res.json({ success: true, data: { isLiked: false } });
    } else {
      await prisma.like.create({
        data: { userId, postId: id },
      });
      await prisma.post.update({
        where: { id },
        data: { likeCount: { increment: 1 } },
      });

      // Create notification
      const post = await prisma.post.findUnique({ where: { id } });
      if (post && post.userId !== userId) {
        await this.createNotification(post.userId, 'like', userId, { postId: id });
      }

      res.json({ success: true, data: { isLiked: true } });
    }
  }

  async toggleProjectLike(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.like.findUnique({
      where: { userId_projectId: { userId, projectId: id } },
    });

    if (existing) {
      await prisma.like.delete({
        where: { userId_projectId: { userId, projectId: id } },
      });
      res.json({ success: true, data: { isLiked: false } });
    } else {
      await prisma.like.create({
        data: { userId, projectId: id },
      });

      const project = await prisma.project.findUnique({ where: { id } });
      if (project && project.userId !== userId) {
        await this.createNotification(project.userId, 'like', userId, { projectId: id });
      }

      res.json({ success: true, data: { isLiked: true } });
    }
  }

  // ============================================================================
  // COMMENTS
  // ============================================================================

  async getPostComments(req: Request, res: Response) {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const comments = await prisma.comment.findMany({
      where: { postId: id, parentCommentId: null, deletedAt: null },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        replies: {
          where: { deletedAt: null },
          include: {
            user: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    res.json({
      success: true,
      data: comments,
    });
  }

  async getProjectComments(req: Request, res: Response) {
    const { id } = req.params;

    const comments = await prisma.comment.findMany({
      where: { projectId: id, parentCommentId: null, deletedAt: null },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        replies: {
          where: { deletedAt: null },
          include: {
            user: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: comments,
    });
  }

  async getPatternComments(req: Request, res: Response) {
    const { id } = req.params;

    const comments = await prisma.comment.findMany({
      where: { patternId: id, parentCommentId: null, deletedAt: null },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        replies: {
          where: { deletedAt: null },
          include: {
            user: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: comments,
    });
  }

  async addComment(req: Request, res: Response) {
    const userId = req.user!.id;
    const { content, postId, projectId, patternId, parentCommentId } = req.body;

    // Validate that exactly one target is provided
    const targets = [postId, projectId, patternId].filter(Boolean);
    if (targets.length !== 1) {
      throw new AppError('Must specify exactly one of postId, projectId, or patternId', 400);
    }

    const comment = await prisma.comment.create({
      data: {
        userId,
        content,
        postId,
        projectId,
        patternId,
        parentCommentId,
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    // Update parent comment reply count
    if (parentCommentId) {
      await prisma.comment.update({
        where: { id: parentCommentId },
        data: { replyCount: { increment: 1 } },
      });
    }

    // Update post comment count
    if (postId) {
      await prisma.post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      });

      // Notify post author
      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (post && post.userId !== userId) {
        await this.createNotification(post.userId, 'comment', userId, {
          postId,
          commentId: comment.id,
        });
      }
    }

    res.status(201).json({
      success: true,
      data: comment,
    });
  }

  async deleteComment(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;

    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment || comment.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    await prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({
      success: true,
      message: 'Comment deleted',
    });
  }

  // ============================================================================
  // FOLLOWS
  // ============================================================================

  async follow(req: Request, res: Response) {
    const { userId: targetId } = req.params;
    const userId = req.user!.id;

    if (userId === targetId) {
      throw new AppError('Cannot follow yourself', 400);
    }

    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId: userId, followingId: targetId },
      },
    });

    if (existing) {
      throw new AppError('Already following this user', 400);
    }

    await prisma.follow.create({
      data: { followerId: userId, followingId: targetId },
    });

    // Update stats
    await Promise.all([
      prisma.userStats.update({
        where: { userId },
        data: { followingCount: { increment: 1 } },
      }),
      prisma.userStats.update({
        where: { userId: targetId },
        data: { followerCount: { increment: 1 } },
      }),
    ]);

    // Create notification
    await this.createNotification(targetId, 'follow', userId, {});

    res.json({
      success: true,
      data: { isFollowing: true },
    });
  }

  async unfollow(req: Request, res: Response) {
    const { userId: targetId } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId: userId, followingId: targetId },
      },
    });

    if (!existing) {
      throw new AppError('Not following this user', 400);
    }

    await prisma.follow.delete({
      where: {
        followerId_followingId: { followerId: userId, followingId: targetId },
      },
    });

    // Update stats
    await Promise.all([
      prisma.userStats.update({
        where: { userId },
        data: { followingCount: { decrement: 1 } },
      }),
      prisma.userStats.update({
        where: { userId: targetId },
        data: { followerCount: { decrement: 1 } },
      }),
    ]);

    res.json({
      success: true,
      data: { isFollowing: false },
    });
  }

  async getFollowStatus(req: Request, res: Response) {
    const { userId: targetId } = req.params;
    const userId = req.user!.id;

    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId: userId, followingId: targetId },
      },
    });

    res.json({
      success: true,
      data: { isFollowing: !!follow },
    });
  }

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  async getNotifications(req: Request, res: Response) {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';

    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    res.json({
      success: true,
      data: {
        items: notifications,
        total,
        unreadCount,
        page,
        pageSize: limit,
        hasMore: total > page * limit,
      },
    });
  }

  async markNotificationRead(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      throw new AppError('Notification not found', 404);
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  }

  async markAllNotificationsRead(req: Request, res: Response) {
    const userId = req.user!.id;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async createNotification(
    userId: string,
    type: string,
    actorId: string,
    data: { postId?: string; projectId?: string; patternId?: string; commentId?: string }
  ) {
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { username: true, displayName: true },
    });

    const messages: Record<string, string> = {
      follow: `${actor?.displayName || actor?.username} started following you`,
      like: `${actor?.displayName || actor?.username} liked your post`,
      comment: `${actor?.displayName || actor?.username} commented on your post`,
    };

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        actorId,
        postId: data.postId,
        projectId: data.projectId,
        patternId: data.patternId,
        commentId: data.commentId,
        message: messages[type],
        data: data as any,
      },
    });

    // Send real-time notification via socket
    io.to(`user:${userId}`).emit('notification:new', notification);

    return notification;
  }
}


