import { Router } from 'express';
import { body } from 'express-validator';
import { CounterController } from '../controllers/counterController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
const counterController = new CounterController();

// Get current counter state for a section
router.get(
  '/section/:sectionId',
  authenticate,
  asyncHandler(counterController.getState)
);

// Increment counter (next row)
router.post(
  '/section/:sectionId/increment',
  authenticate,
  [
    body('inputType').optional().isIn(['click', 'voice', 'gesture', 'auto']),
    body('voiceTranscript').optional().isString(),
  ],
  asyncHandler(counterController.increment)
);

// Decrement counter (previous row)
router.post(
  '/section/:sectionId/decrement',
  authenticate,
  [
    body('inputType').optional().isIn(['click', 'voice', 'gesture', 'auto']),
  ],
  asyncHandler(counterController.decrement)
);

// Set counter to specific row
router.post(
  '/section/:sectionId/set',
  authenticate,
  [
    body('rowNumber').isInt({ min: 0 }),
    body('inputType').optional().isIn(['click', 'voice', 'gesture', 'auto']),
  ],
  asyncHandler(counterController.setRow)
);

// Reset counter
router.post(
  '/section/:sectionId/reset',
  authenticate,
  asyncHandler(counterController.reset)
);

// Get counter history
router.get(
  '/section/:sectionId/history',
  authenticate,
  asyncHandler(counterController.getHistory)
);

// Undo last counter action
router.post(
  '/section/:sectionId/undo',
  authenticate,
  asyncHandler(counterController.undo)
);

// Set active section (for voice commands)
router.post(
  '/section/:sectionId/activate',
  authenticate,
  asyncHandler(counterController.setActive)
);

// Get current instruction for active row
router.get(
  '/section/:sectionId/instruction',
  authenticate,
  asyncHandler(counterController.getCurrentInstruction)
);

// Update counter settings
router.patch(
  '/section/:sectionId/settings',
  authenticate,
  [
    body('counterHapticFeedback').optional().isBoolean(),
    body('counterSoundEnabled').optional().isBoolean(),
    body('counterVoiceEnabled').optional().isBoolean(),
  ],
  asyncHandler(counterController.updateSettings)
);

export default router;


