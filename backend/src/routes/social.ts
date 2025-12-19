import { Router } from 'express';
import { body, query } from 'express-validator';
import { SocialController } from '../controllers/socialController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
const socialController = new SocialController();

// ============================================================================
// FEED
// ============================================================================

// Get home feed
router.get('/feed', authenticate, asyncHandler(socialController.getFeed));

// Get discover/explore feed
router.get('/discover', optionalAuth, asyncHandler(socialController.getDiscover));

// ============================================================================
// POSTS
// ============================================================================

// Create post
router.post(
  '/posts',
  authenticate,
  [
    body('content').optional().isString().isLength({ max: 2000 }),
    body('projectId').optional().isUUID(),
    body('visibility').optional().isIn(['private', 'followers', 'public']),
  ],
  asyncHandler(socialController.createPost)
);

// Get post by ID
router.get('/posts/:id', optionalAuth, asyncHandler(socialController.getPost));

// Update post
router.patch('/posts/:id', authenticate, asyncHandler(socialController.updatePost));

// Delete post
router.delete('/posts/:id', authenticate, asyncHandler(socialController.deletePost));

// ============================================================================
// LIKES
// ============================================================================

// Like/unlike post
router.post('/posts/:id/like', authenticate, asyncHandler(socialController.togglePostLike));

// Like/unlike project
router.post(
  '/projects/:id/like',
  authenticate,
  asyncHandler(socialController.toggleProjectLike)
);

// ============================================================================
// COMMENTS
// ============================================================================

// Get comments for post
router.get('/posts/:id/comments', asyncHandler(socialController.getPostComments));

// Get comments for project
router.get('/projects/:id/comments', asyncHandler(socialController.getProjectComments));

// Get comments for pattern
router.get('/patterns/:id/comments', asyncHandler(socialController.getPatternComments));

// Add comment
router.post(
  '/comments',
  authenticate,
  [
    body('content').isString().isLength({ min: 1, max: 2000 }),
    body('postId').optional().isUUID(),
    body('projectId').optional().isUUID(),
    body('patternId').optional().isUUID(),
    body('parentCommentId').optional().isUUID(),
  ],
  asyncHandler(socialController.addComment)
);

// Delete comment
router.delete('/comments/:id', authenticate, asyncHandler(socialController.deleteComment));

// ============================================================================
// FOLLOWS
// ============================================================================

// Follow user
router.post('/follow/:userId', authenticate, asyncHandler(socialController.follow));

// Unfollow user
router.delete('/follow/:userId', authenticate, asyncHandler(socialController.unfollow));

// Check if following
router.get(
  '/follow/:userId/status',
  authenticate,
  asyncHandler(socialController.getFollowStatus)
);

// ============================================================================
// NOTIFICATIONS
// ============================================================================

// Get notifications
router.get('/notifications', authenticate, asyncHandler(socialController.getNotifications));

// Mark notification as read
router.post(
  '/notifications/:id/read',
  authenticate,
  asyncHandler(socialController.markNotificationRead)
);

// Mark all notifications as read
router.post(
  '/notifications/read-all',
  authenticate,
  asyncHandler(socialController.markAllNotificationsRead)
);

export default router;


