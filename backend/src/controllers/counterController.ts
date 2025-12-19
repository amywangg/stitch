import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { io } from '../index.js';

export class CounterController {
  /**
   * Get current counter state for a section
   */
  async getState(req: Request, res: Response) {
    const { sectionId } = req.params;
    const userId = req.user!.id;

    const section = await prisma.projectSection.findUnique({
      where: { id: sectionId },
      include: {
        project: true,
        patternSection: {
          include: {
            rows: {
              orderBy: { rowNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    // Check ownership
    if (section.project.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    // Get current instruction based on row
    const currentInstruction = section.patternSection?.rows.find(
      (r) => r.rowNumber === section.currentRow
    );
    const nextInstruction = section.patternSection?.rows.find(
      (r) => r.rowNumber === section.currentRow + 1
    );

    // Check if measurement is needed
    const needsMeasurement =
      section.nextMeasureAtRow !== null &&
      section.currentRow >= section.nextMeasureAtRow;

    res.json({
      success: true,
      data: {
        sectionId: section.id,
        name: section.name,
        currentRow: section.currentRow,
        totalRows: section.totalRows,
        isEstimatedTotal: section.isEstimatedTotal,
        isActive: section.isActive,
        isCompleted: section.isCompleted,
        currentInstruction,
        nextInstruction,
        needsMeasurement,
        measurementReminder: needsMeasurement
          ? `Time to measure! Target: ${section.targetMeasurementCm}cm`
          : null,
        settings: {
          hapticFeedback: section.counterHapticFeedback,
          soundEnabled: section.counterSoundEnabled,
          voiceEnabled: section.counterVoiceEnabled,
        },
      },
    });
  }

  /**
   * Increment counter (go to next row)
   */
  async increment(req: Request, res: Response) {
    const { sectionId } = req.params;
    const { inputType = 'click', voiceTranscript } = req.body;
    const userId = req.user!.id;

    const section = await prisma.projectSection.findUnique({
      where: { id: sectionId },
      include: {
        project: true,
        patternSection: {
          include: {
            rows: { orderBy: { rowNumber: 'asc' } },
          },
        },
      },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    if (section.project.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    const previousRow = section.currentRow;
    const newRow = previousRow + 1;

    // Check if section is complete
    const isComplete = section.totalRows !== null && newRow > section.totalRows;

    // Update section
    await prisma.projectSection.update({
      where: { id: sectionId },
      data: {
        currentRow: isComplete ? section.totalRows! : newRow,
        isCompleted: isComplete,
        completedAt: isComplete ? new Date() : null,
      },
    });

    // Record history
    await prisma.rowCounterHistory.create({
      data: {
        projectSectionId: sectionId,
        rowNumber: newRow,
        action: 'increment',
        previousValue: previousRow,
        inputType: inputType as any,
        voiceTranscript,
      },
    });

    // Get current instruction
    const currentInstruction = section.patternSection?.rows.find(
      (r) => r.rowNumber === newRow
    );

    // Check if measurement is needed
    const needsMeasurement =
      section.nextMeasureAtRow !== null && newRow >= section.nextMeasureAtRow;

    // Emit socket event for real-time sync
    io.to(`project:${section.projectId}`).emit('counter:updated', {
      projectId: section.projectId,
      sectionId,
      newRow: isComplete ? section.totalRows : newRow,
      action: 'increment',
      inputType,
    });

    // Update project progress
    await this.updateProjectProgress(section.projectId);

    res.json({
      success: true,
      data: {
        newRow: isComplete ? section.totalRows : newRow,
        previousRow,
        currentInstruction,
        needsMeasurement,
        measurementMessage: needsMeasurement
          ? `Time to measure! Target: ${section.targetMeasurementCm}cm`
          : null,
        sectionCompleted: isComplete,
        checkpointMessage: currentInstruction?.isCheckpoint
          ? currentInstruction.checkpointMessage
          : null,
      },
    });
  }

  /**
   * Decrement counter (go back a row)
   */
  async decrement(req: Request, res: Response) {
    const { sectionId } = req.params;
    const { inputType = 'click' } = req.body;
    const userId = req.user!.id;

    const section = await prisma.projectSection.findUnique({
      where: { id: sectionId },
      include: { project: true },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    if (section.project.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    if (section.currentRow <= 0) {
      throw new AppError('Already at row 0', 400);
    }

    const previousRow = section.currentRow;
    const newRow = previousRow - 1;

    await prisma.projectSection.update({
      where: { id: sectionId },
      data: {
        currentRow: newRow,
        isCompleted: false,
        completedAt: null,
      },
    });

    await prisma.rowCounterHistory.create({
      data: {
        projectSectionId: sectionId,
        rowNumber: newRow,
        action: 'decrement',
        previousValue: previousRow,
        inputType: inputType as any,
      },
    });

    io.to(`project:${section.projectId}`).emit('counter:updated', {
      projectId: section.projectId,
      sectionId,
      newRow,
      action: 'decrement',
      inputType,
    });

    res.json({
      success: true,
      data: {
        newRow,
        previousRow,
      },
    });
  }

  /**
   * Set counter to specific row
   */
  async setRow(req: Request, res: Response) {
    const { sectionId } = req.params;
    const { rowNumber, inputType = 'click' } = req.body;
    const userId = req.user!.id;

    const section = await prisma.projectSection.findUnique({
      where: { id: sectionId },
      include: { project: true },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    if (section.project.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    const previousRow = section.currentRow;

    await prisma.projectSection.update({
      where: { id: sectionId },
      data: { currentRow: rowNumber },
    });

    await prisma.rowCounterHistory.create({
      data: {
        projectSectionId: sectionId,
        rowNumber,
        action: 'set',
        previousValue: previousRow,
        inputType: inputType as any,
      },
    });

    io.to(`project:${section.projectId}`).emit('counter:updated', {
      projectId: section.projectId,
      sectionId,
      newRow: rowNumber,
      action: 'set',
    });

    res.json({
      success: true,
      data: {
        newRow: rowNumber,
        previousRow,
      },
    });
  }

  /**
   * Reset counter to 0
   */
  async reset(req: Request, res: Response) {
    const { sectionId } = req.params;
    const userId = req.user!.id;

    const section = await prisma.projectSection.findUnique({
      where: { id: sectionId },
      include: { project: true },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    if (section.project.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    const previousRow = section.currentRow;

    await prisma.projectSection.update({
      where: { id: sectionId },
      data: {
        currentRow: 0,
        isCompleted: false,
        completedAt: null,
      },
    });

    await prisma.rowCounterHistory.create({
      data: {
        projectSectionId: sectionId,
        rowNumber: 0,
        action: 'reset',
        previousValue: previousRow,
        inputType: 'click',
      },
    });

    res.json({
      success: true,
      data: {
        newRow: 0,
        previousRow,
      },
    });
  }

  /**
   * Get counter history
   */
  async getHistory(req: Request, res: Response) {
    const { sectionId } = req.params;
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;

    const section = await prisma.projectSection.findUnique({
      where: { id: sectionId },
      include: { project: true },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    if (section.project.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    const history = await prisma.rowCounterHistory.findMany({
      where: { projectSectionId: sectionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({
      success: true,
      data: history,
    });
  }

  /**
   * Undo last counter action
   */
  async undo(req: Request, res: Response) {
    const { sectionId } = req.params;
    const userId = req.user!.id;

    const section = await prisma.projectSection.findUnique({
      where: { id: sectionId },
      include: { project: true },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    if (section.project.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    // Get last history entry
    const lastAction = await prisma.rowCounterHistory.findFirst({
      where: { projectSectionId: sectionId },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastAction || lastAction.previousValue === null) {
      throw new AppError('Nothing to undo', 400);
    }

    // Restore previous value
    await prisma.projectSection.update({
      where: { id: sectionId },
      data: { currentRow: lastAction.previousValue },
    });

    // Remove the last action
    await prisma.rowCounterHistory.delete({
      where: { id: lastAction.id },
    });

    res.json({
      success: true,
      data: {
        newRow: lastAction.previousValue,
        undoneAction: lastAction.action,
      },
    });
  }

  /**
   * Set section as active
   */
  async setActive(req: Request, res: Response) {
    const { sectionId } = req.params;
    const userId = req.user!.id;

    const section = await prisma.projectSection.findUnique({
      where: { id: sectionId },
      include: { project: true },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    if (section.project.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    // Deactivate all sections in project
    await prisma.projectSection.updateMany({
      where: { projectId: section.projectId },
      data: { isActive: false },
    });

    // Activate this section
    await prisma.projectSection.update({
      where: { id: sectionId },
      data: { isActive: true },
    });

    res.json({
      success: true,
      data: { sectionId, isActive: true },
    });
  }

  /**
   * Get current instruction for active row
   */
  async getCurrentInstruction(req: Request, res: Response) {
    const { sectionId } = req.params;
    const userId = req.user!.id;

    const section = await prisma.projectSection.findUnique({
      where: { id: sectionId },
      include: {
        project: true,
        patternSection: {
          include: {
            rows: { orderBy: { rowNumber: 'asc' } },
          },
        },
      },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    if (section.project.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    const currentInstruction = section.patternSection?.rows.find(
      (r) => r.rowNumber === section.currentRow
    );

    res.json({
      success: true,
      data: {
        currentRow: section.currentRow,
        instruction: currentInstruction || null,
      },
    });
  }

  /**
   * Update counter settings
   */
  async updateSettings(req: Request, res: Response) {
    const { sectionId } = req.params;
    const { counterHapticFeedback, counterSoundEnabled, counterVoiceEnabled } = req.body;
    const userId = req.user!.id;

    const section = await prisma.projectSection.findUnique({
      where: { id: sectionId },
      include: { project: true },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    if (section.project.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    const updated = await prisma.projectSection.update({
      where: { id: sectionId },
      data: {
        counterHapticFeedback,
        counterSoundEnabled,
        counterVoiceEnabled,
      },
    });

    res.json({
      success: true,
      data: {
        hapticFeedback: updated.counterHapticFeedback,
        soundEnabled: updated.counterSoundEnabled,
        voiceEnabled: updated.counterVoiceEnabled,
      },
    });
  }

  /**
   * Update project progress based on section completion
   */
  private async updateProjectProgress(projectId: string) {
    const sections = await prisma.projectSection.findMany({
      where: { projectId },
    });

    if (sections.length === 0) return;

    let totalProgress = 0;
    for (const section of sections) {
      if (section.isCompleted) {
        totalProgress += 100;
      } else if (section.totalRows && section.totalRows > 0) {
        totalProgress += (section.currentRow / section.totalRows) * 100;
      }
    }

    const progressPercent = Math.round(totalProgress / sections.length);

    await prisma.project.update({
      where: { id: projectId },
      data: {
        progressPercent,
        status: progressPercent >= 100 ? 'completed' : 'in_progress',
        completedAt: progressPercent >= 100 ? new Date() : null,
      },
    });
  }
}


