import { Router } from 'express';
import { body, query } from 'express-validator';
import { PatternController } from '../controllers/patternController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
const patternController = new PatternController();

// List patterns (with search/filter)
router.get(
  '/',
  optionalAuth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('craft').optional().isIn(['knitting', 'crochet', 'both']),
    query('difficulty').optional(),
    query('garmentType').optional(),
    query('search').optional().isString(),
  ],
  asyncHandler(patternController.list)
);

// Check if pattern already exists (for cache lookup)
router.get(
  '/check-existing',
  asyncHandler(patternController.checkExistingPattern)
);

// Get pattern by ID
router.get('/:id', optionalAuth, asyncHandler(patternController.getById));

// Get pattern by author/slug
router.get(
  '/by/:username/:slug',
  optionalAuth,
  asyncHandler(patternController.getBySlug)
);

// Create pattern
router.post(
  '/',
  authenticate,
  [
    body('title').isLength({ min: 1, max: 255 }),
    body('description').optional().isString(),
    body('craftType').optional().isIn(['knitting', 'crochet', 'both']),
    body('difficulty').optional(),
  ],
  asyncHandler(patternController.create)
);

// Update pattern
router.patch('/:id', authenticate, asyncHandler(patternController.update));

// Delete pattern
router.delete('/:id', authenticate, asyncHandler(patternController.delete));

// Get pattern sections with rows
router.get('/:id/sections', optionalAuth, asyncHandler(patternController.getSections));

// Add/update pattern section
router.post('/:id/sections', authenticate, asyncHandler(patternController.addSection));

// Add rows to section
router.post(
  '/:id/sections/:sectionId/rows',
  authenticate,
  asyncHandler(patternController.addRows)
);

// Get pattern sizes
router.get('/:id/sizes', asyncHandler(patternController.getSizes));

// Add pattern size
router.post('/:id/sizes', authenticate, asyncHandler(patternController.addSize));

// Favorite/unfavorite pattern
router.post('/:id/favorite', authenticate, asyncHandler(patternController.toggleFavorite));

// Get user's favorite patterns
router.get('/favorites/me', authenticate, asyncHandler(patternController.getMyFavorites));

export default router;

