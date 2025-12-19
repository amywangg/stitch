import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { slugify } from '../utils/slugify.js';

export class ProjectController {
  async getMyProjects(req: Request, res: Response) {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const where: any = {
      userId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          pattern: { select: { title: true, slug: true, author: { select: { username: true } } } },
          sections: {
            orderBy: { displayOrder: 'asc' },
            select: {
              id: true,
              name: true,
              currentRow: true,
              totalRows: true,
              isActive: true,
              isCompleted: true,
            },
          },
          _count: { select: { images: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.project.count({ where }),
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

  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        pattern: {
          include: {
            author: { select: { username: true, displayName: true } },
            sizes: { orderBy: { displayOrder: 'asc' } },
          },
        },
        size: true,
        sections: {
          orderBy: { displayOrder: 'asc' },
          include: {
            patternSection: {
              include: {
                rows: { orderBy: { rowNumber: 'asc' } },
              },
            },
          },
        },
        gauge: true,
        images: { orderBy: { displayOrder: 'asc' } },
        yarns: {
          include: {
            yarn: { include: { brand: true } },
            stashYarn: true,
          },
        },
      },
    });

    if (!project || project.deletedAt) {
      throw new AppError('Project not found', 404);
    }

    // Check visibility
    if (project.visibility === 'private' && project.userId !== userId) {
      throw new AppError('Project not found', 404);
    }

    if (project.visibility === 'followers' && project.userId !== userId) {
      const isFollowing = userId
        ? await prisma.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: userId,
                followingId: project.userId,
              },
            },
          })
        : null;

      if (!isFollowing) {
        throw new AppError('Project not found', 404);
      }
    }

    res.json({
      success: true,
      data: project,
    });
  }

  async create(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errors.array()[0].msg, 400);
    }

    const userId = req.user!.id;
    const { title, patternId, sizeId, description, visibility, notes } = req.body;

    const slug = slugify(title);

    // Check for duplicate slug
    const existing = await prisma.project.findUnique({
      where: { userId_slug: { userId, slug } },
    });

    if (existing) {
      throw new AppError('A project with this name already exists', 400);
    }

    // If using a pattern, copy sections
    let sectionsToCreate: any[] = [];
    if (patternId) {
      const patternSections = await prisma.patternSection.findMany({
        where: { patternId },
        orderBy: { displayOrder: 'asc' },
        include: {
          rows: true,
        },
      });

      // Get gauge from pattern for row estimation
      const pattern = await prisma.pattern.findUnique({
        where: { id: patternId },
      });

      sectionsToCreate = patternSections.map((section) => {
        // Calculate total rows for measurement-based sections
        let totalRows = section.rows.length;
        let isEstimatedTotal = false;

        const measuredRow = section.rows.find((r) => r.instructionType === 'measured');
        if (measuredRow && measuredRow.targetMeasurementCm && pattern?.gaugeRows) {
          totalRows = Math.round(
            (measuredRow.targetMeasurementCm / 10) * pattern.gaugeRows
          );
          isEstimatedTotal = true;
        }

        return {
          patternSectionId: section.id,
          name: section.name,
          sectionType: section.sectionType,
          displayOrder: section.displayOrder,
          totalRows,
          isEstimatedTotal,
          targetMeasurementCm: measuredRow?.targetMeasurementCm,
          nextMeasureAtRow: measuredRow?.measureEveryNRows,
        };
      });
    }

    const project = await prisma.project.create({
      data: {
        userId,
        patternId,
        sizeId,
        title,
        slug,
        description,
        visibility: visibility || 'public',
        notes,
        sections: {
          create: sectionsToCreate,
        },
      },
      include: {
        sections: true,
      },
    });

    // Update user stats
    await prisma.userStats.update({
      where: { userId },
      data: { projectCount: { increment: 1 } },
    });

    // Update pattern project count
    if (patternId) {
      await prisma.pattern.update({
        where: { id: patternId },
        data: { projectCount: { increment: 1 } },
      });
    }

    res.status(201).json({
      success: true,
      data: project,
    });
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project || project.deletedAt) {
      throw new AppError('Project not found', 404);
    }

    if (project.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    const { title, description, status, visibility, notes, coverImageUrl } = req.body;

    let slug = project.slug;
    if (title && title !== project.title) {
      slug = slugify(title);
      const existing = await prisma.project.findFirst({
        where: { userId, slug, id: { not: id } },
      });
      if (existing) {
        throw new AppError('A project with this name already exists', 400);
      }
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        title,
        slug,
        description,
        status,
        visibility,
        notes,
        coverImageUrl,
        startedAt: status === 'in_progress' && !project.startedAt ? new Date() : project.startedAt,
        completedAt: status === 'completed' ? new Date() : null,
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    if (project.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    await prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({
      success: true,
      message: 'Project deleted',
    });
  }

  async getSections(req: Request, res: Response) {
    const { id } = req.params;

    const sections = await prisma.projectSection.findMany({
      where: { projectId: id },
      include: {
        patternSection: {
          include: {
            rows: { orderBy: { rowNumber: 'asc' } },
          },
        },
        measurements: { orderBy: { measuredAtRow: 'asc' } },
      },
      orderBy: { displayOrder: 'asc' },
    });

    res.json({
      success: true,
      data: sections,
    });
  }

  async addSection(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project || project.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    const { name, sectionType, displayOrder, totalRows, targetMeasurementCm } = req.body;

    const section = await prisma.projectSection.create({
      data: {
        projectId: id,
        name,
        sectionType,
        displayOrder,
        totalRows,
        targetMeasurementCm,
      },
    });

    res.status(201).json({
      success: true,
      data: section,
    });
  }

  async updateSection(req: Request, res: Response) {
    const { id, sectionId } = req.params;
    const userId = req.user!.id;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project || project.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    const updated = await prisma.projectSection.update({
      where: { id: sectionId },
      data: req.body,
    });

    res.json({
      success: true,
      data: updated,
    });
  }

  async getGauge(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;

    const project = await prisma.project.findUnique({
      where: { id },
      include: { gauge: true },
    });

    if (!project || project.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    res.json({
      success: true,
      data: project.gauge,
    });
  }

  async setGauge(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;

    const project = await prisma.project.findUnique({
      where: { id },
      include: { gauge: true, sections: true },
    });

    if (!project || project.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    const gaugeData = req.body;

    let gauge;
    if (project.gauge) {
      gauge = await prisma.projectGauge.update({
        where: { projectId: id },
        data: gaugeData,
      });
    } else {
      gauge = await prisma.projectGauge.create({
        data: {
          projectId: id,
          ...gaugeData,
        },
      });
    }

    // Recalculate estimated rows for measurement-based sections
    if (gauge.rowsPer10cm) {
      for (const section of project.sections) {
        if (section.targetMeasurementCm && section.isEstimatedTotal) {
          const estimatedRows = Math.round(
            (section.targetMeasurementCm / 10) * gauge.rowsPer10cm
          );
          await prisma.projectSection.update({
            where: { id: section.id },
            data: { totalRows: estimatedRows },
          });
        }
      }
    }

    res.json({
      success: true,
      data: gauge,
    });
  }

  async addMeasurement(req: Request, res: Response) {
    const { id, sectionId } = req.params;
    const userId = req.user!.id;
    const { measuredAtRow, measurementCm, notes } = req.body;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project || project.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    const section = await prisma.projectSection.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new AppError('Section not found', 404);
    }

    const measurement = await prisma.projectMeasurement.create({
      data: {
        projectSectionId: sectionId,
        measuredAtRow,
        measurementCm,
        targetCm: section.targetMeasurementCm,
        notes,
      },
    });

    // Update section with current measurement
    await prisma.projectSection.update({
      where: { id: sectionId },
      data: {
        currentMeasurementCm: measurementCm,
        lastMeasuredAtRow: measuredAtRow,
        // Calculate next measurement checkpoint
        nextMeasureAtRow: section.nextMeasureAtRow
          ? measuredAtRow + (section.nextMeasureAtRow - (section.lastMeasuredAtRow || 0))
          : null,
      },
    });

    res.status(201).json({
      success: true,
      data: measurement,
    });
  }
}


