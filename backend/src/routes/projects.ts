import { Router } from 'express';
import { body, query } from 'express-validator';
import { ProjectController } from '../controllers/projectController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
const projectController = new ProjectController();

// List my projects
router.get('/me', authenticate, asyncHandler(projectController.getMyProjects));

// Get project by ID
router.get('/:id', optionalAuth, asyncHandler(projectController.getById));

// Create project
router.post(
  '/',
  authenticate,
  [
    body('title').isLength({ min: 1, max: 255 }),
    body('patternId').optional().isUUID(),
    body('sizeId').optional().isUUID(),
    body('description').optional().isString(),
    body('visibility').optional().isIn(['private', 'followers', 'public']),
  ],
  asyncHandler(projectController.create)
);

// Update project
router.patch('/:id', authenticate, asyncHandler(projectController.update));

// Delete project
router.delete('/:id', authenticate, asyncHandler(projectController.delete));

// Get project sections
router.get('/:id/sections', optionalAuth, asyncHandler(projectController.getSections));

// Add project section
router.post('/:id/sections', authenticate, asyncHandler(projectController.addSection));

// Update project section
router.patch(
  '/:id/sections/:sectionId',
  authenticate,
  asyncHandler(projectController.updateSection)
);

// Get project gauge
router.get('/:id/gauge', authenticate, asyncHandler(projectController.getGauge));

// Set project gauge
router.post(
  '/:id/gauge',
  authenticate,
  [
    body('stitchesPer10cm').optional().isFloat({ min: 0 }),
    body('rowsPer10cm').optional().isFloat({ min: 0 }),
    body('needleMm').optional().isFloat({ min: 0 }),
  ],
  asyncHandler(projectController.setGauge)
);

// Add measurement
router.post(
  '/:id/sections/:sectionId/measurements',
  authenticate,
  [
    body('measuredAtRow').isInt({ min: 0 }),
    body('measurementCm').isFloat({ min: 0 }),
  ],
  asyncHandler(projectController.addMeasurement)
);

export default router;


