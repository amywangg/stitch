import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/authController.js';
import { OAuthController } from '../controllers/oauthController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
const authController = new AuthController();
const oauthController = new OAuthController();

// Register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('username')
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_]+$/),
    body('password').isLength({ min: 8 }),
    body('displayName').optional().isLength({ max: 100 }),
  ],
  asyncHandler(authController.register)
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  asyncHandler(authController.login)
);

// Refresh token
router.post('/refresh', asyncHandler(authController.refreshToken));

// Logout
router.post('/logout', authenticate, asyncHandler(authController.logout));

// Get current user
router.get('/me', authenticate, asyncHandler(authController.getCurrentUser));

// Change password
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  asyncHandler(authController.changePassword)
);

// ============================================================================
// OAUTH ROUTES
// ============================================================================

// Google OAuth
router.post(
  '/google',
  [body('credential').notEmpty()],
  asyncHandler(oauthController.googleAuth.bind(oauthController))
);

// Apple OAuth
router.post(
  '/apple',
  [body('identityToken').notEmpty()],
  asyncHandler(oauthController.appleAuth.bind(oauthController))
);

export default router;

