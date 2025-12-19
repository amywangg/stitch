import { Router } from 'express';
import { body } from 'express-validator';
import { UserController } from '../controllers/userController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
const userController = new UserController();

// Check username availability
router.get('/check-username/:username', asyncHandler(userController.checkUsername));

// Get user by username
router.get('/:username', optionalAuth, asyncHandler(userController.getByUsername));

// Update profile
router.patch(
  '/profile',
  authenticate,
  [
    body('displayName').optional().isLength({ max: 100 }),
    body('bio').optional().isLength({ max: 500 }),
    body('location').optional().isLength({ max: 100 }),
    body('websiteUrl').optional().custom((value) => {
      if (!value || value === '') return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }).withMessage('Invalid URL'),
  ],
  asyncHandler(userController.updateProfile)
);

// Update settings
router.patch(
  '/settings',
  authenticate,
  asyncHandler(userController.updateSettings)
);

// Get user's projects
router.get('/:username/projects', optionalAuth, asyncHandler(userController.getUserProjects));

// Get user's patterns
router.get('/:username/patterns', optionalAuth, asyncHandler(userController.getUserPatterns));

// Get followers
router.get('/:username/followers', asyncHandler(userController.getFollowers));

// Get following
router.get('/:username/following', asyncHandler(userController.getFollowing));

export default router;

