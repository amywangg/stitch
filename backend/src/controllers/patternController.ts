import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { slugify } from '../utils/slugify.js';

export class PatternController {
  async list(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const { craft, difficulty, garmentType, search, myLibrary, favorites } = req.query;
    const userId = req.user?.id;

    const where: any = {
      deletedAt: null,
    };

    // If myLibrary is true, show only user's own patterns (regardless of published status)
    if (myLibrary === 'true' && userId) {
      where.authorId = userId;
      // Don't filter by isPublished for user's own library
    } else if (favorites === 'true' && userId) {
      // Show user's favorited patterns
      where.favorites = {
        some: {
          userId: userId,
        },
      };
      where.isPublished = true; // Only show published favorited patterns
    } else {
      // Default: show only published patterns
      where.isPublished = true;
    }

    if (craft) where.craftType = craft;
    if (difficulty) where.difficulty = difficulty;
    if (garmentType) where.garmentType = garmentType;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { designerName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [patterns, total] = await Promise.all([
      prisma.pattern.findMany({
        where,
        include: {
          author: {
            select: { username: true, displayName: true, avatarUrl: true },
          },
          listing: { select: { price: true, currency: true } },
          _count: { select: { favorites: true, projects: true } },
          ...(userId && {
            favorites: {
              where: { userId },
              select: { userId: true },
            },
          }),
        },
        orderBy: { createdAt: 'desc' }, // Changed from publishedAt to createdAt for library view
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.pattern.count({ where }),
    ]);

    // Add isFavorited flag if user is logged in
    const patternsWithFavorites = patterns.map((pattern) => ({
      ...pattern,
      isFavorited: userId ? pattern.favorites && pattern.favorites.length > 0 : false,
      favorites: undefined, // Remove from response
    }));

    res.json({
      success: true,
      data: {
        items: patternsWithFavorites,
        total,
        page,
        pageSize: limit,
        hasMore: total > page * limit,
      },
    });
  }

  async checkExistingPattern(req: Request, res: Response) {
    const { title, designer, shopName } = req.query;

    if (!title) {
      return res.json({
        success: true,
        data: { exists: false, pattern: null }
      });
    }

    try {
      const existing = await prisma.pattern.findFirst({
        where: {
          patternSource: 'uploaded',
          isOriginal: true,
          isEdited: false,
          title: {
            equals: title as string,
            mode: 'insensitive'
          },
          ...(designer && {
            designerName: {
              equals: designer as string,
              mode: 'insensitive'
            }
          }),
          ...(shopName && {
            shopName: {
              equals: shopName as string,
              mode: 'insensitive'
            }
          })
        },
        select: {
          id: true,
          title: true,
          designerName: true,
          shopName: true,
          aiParsedData: true // Include parsed data for retrieval
        }
      });

      res.json({
        success: true,
        data: {
          exists: !!existing,
          pattern: existing || null
        }
      });
    } catch (error) {
      console.error('Error checking existing pattern:', error);
      res.json({
        success: true,
        data: { exists: false, pattern: null }
      });
    }
  }

  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;

    const pattern = await prisma.pattern.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        sizes: { orderBy: { displayOrder: 'asc' } },
        images: { orderBy: { displayOrder: 'asc' } },
        listing: true,
        tags: { include: { tag: true } },
        _count: { select: { favorites: true, projects: true, comments: true } },
      },
    });

    if (!pattern || pattern.deletedAt) {
      throw new AppError('Pattern not found', 404);
    }

    // Check if private and not owner
    if (!pattern.isPublished && pattern.authorId !== userId) {
      throw new AppError('Pattern not found', 404);
    }

    // Check if user has favorited
    let isFavorited = false;
    if (userId) {
      const favorite = await prisma.patternFavorite.findUnique({
        where: { userId_patternId: { userId, patternId: id } },
      });
      isFavorited = !!favorite;
    }

    // Increment view count
    await prisma.pattern.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    res.json({
      success: true,
      data: { ...pattern, isFavorited },
    });
  }

  async getBySlug(req: Request, res: Response) {
    const { username, slug } = req.params;

    const author = await prisma.user.findUnique({
      where: { username },
    });

    if (!author) {
      throw new AppError('Pattern not found', 404);
    }

    const pattern = await prisma.pattern.findUnique({
      where: {
        authorId_slug: { authorId: author.id, slug },
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        sizes: { orderBy: { displayOrder: 'asc' } },
        sections: {
          orderBy: { displayOrder: 'asc' },
          include: {
            rows: { orderBy: { rowNumber: 'asc' } },
          },
        },
        images: { orderBy: { displayOrder: 'asc' } },
        listing: true,
      },
    });

    if (!pattern || pattern.deletedAt) {
      throw new AppError('Pattern not found', 404);
    }

    res.json({
      success: true,
      data: pattern,
    });
  }

  async create(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errors.array()[0].msg, 400);
    }

    const userId = req.user!.id;
    const { 
      title, 
      description, 
      designerName, 
      craftType, 
      garmentType, 
      difficulty, 
      isFree,
      purchaseUrl,
      shopName,
      storeName,
      sourcePlatform,
      ravelryPatternId,
      etsyListingId,
      patternSource,
      isPublic,
      hasCopyrightProtection,
      copyrightText,
      isOriginal,
      isEdited,
      parsedPatternData // Full parsed pattern data to store for caching
    } = req.body;

    const slug = slugify(title);

    // Check for duplicate slug (same user, same slug)
    const existingSlug = await prisma.pattern.findUnique({
      where: { authorId_slug: { authorId: userId, slug } },
    });

    if (existingSlug) {
      throw new AppError('A pattern with this name already exists', 400);
    }

    // Check if this is a duplicate of an existing cached pattern (for uploaded patterns)
    // If found, link to the original instead of creating a duplicate
    let canonicalPatternId = null;
    let shouldBeOriginal = isOriginal ?? (patternSource === 'uploaded' ? true : false);
    
    if (patternSource === 'uploaded' && shouldBeOriginal) {
      const existingPattern = await prisma.pattern.findFirst({
        where: {
          patternSource: 'uploaded',
          isOriginal: true,
          isEdited: false,
          title: {
            equals: title,
            mode: 'insensitive'
          },
          ...(designerName && {
            designerName: {
              equals: designerName,
              mode: 'insensitive'
            }
          }),
          ...(shopName && {
            shopName: {
              equals: shopName,
              mode: 'insensitive'
            }
          })
        },
        orderBy: {
          originalParsedAt: 'asc' // Get the first/original one
        }
      });

      if (existingPattern) {
        // Pattern already exists - link to it instead of creating duplicate
        canonicalPatternId = existingPattern.id;
        shouldBeOriginal = false; // This is a duplicate, not the original
        console.log(`[PatternController] Found existing pattern ${existingPattern.id}, linking instead of creating duplicate`);
      }
    }

    const pattern = await prisma.pattern.create({
      data: {
        authorId: userId,
        title,
        slug,
        description,
        designerName: designerName || null,
        craftType,
        garmentType,
        difficulty,
        isFree: isFree ?? true,
        sourceType: 'manual',
        // Source and purchase information
        purchaseUrl: purchaseUrl || null,
        shopName: shopName || null,
        storeName: storeName || null,
        sourcePlatform: sourcePlatform || null,
        ravelryPatternId: ravelryPatternId || null,
        etsyListingId: etsyListingId || null,
        patternSource: patternSource || 'created', // 'uploaded', 'created', 'popular'
        hasCopyrightProtection: hasCopyrightProtection ?? null,
        copyrightText: copyrightText || null,
        canonicalPatternId: canonicalPatternId, // Link to original if duplicate found
        isOriginal: shouldBeOriginal, // Will be false if duplicate found
        isEdited: isEdited ?? false, // New patterns haven't been edited yet
        originalParsedAt: patternSource === 'uploaded' && shouldBeOriginal ? new Date() : null,
        // Store full parsed pattern data for caching (only for original, unedited patterns)
        aiParsedData: (patternSource === 'uploaded' && shouldBeOriginal && !(isEdited ?? false) && parsedPatternData) 
          ? parsedPatternData 
          : undefined,
        // Privacy logic:
        // - Created patterns: can be public if explicitly set
        // - Uploaded patterns: public only if no copyright protection detected
        // - If copyright protection is detected, must be private
        isPublic: patternSource === 'created' 
          ? (isPublic ?? false) 
          : (hasCopyrightProtection === false ? (isPublic ?? false) : false), // Uploaded: public only if no copyright protection
      },
    });

    // Update user stats
    await prisma.userStats.update({
      where: { userId },
      data: { patternCount: { increment: 1 } },
    });

    res.status(201).json({
      success: true,
      data: pattern,
    });
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;

    const pattern = await prisma.pattern.findUnique({
      where: { id },
    });

    if (!pattern || pattern.deletedAt) {
      throw new AppError('Pattern not found', 404);
    }

    if (pattern.authorId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    const {
      title,
      description,
      craftType,
      garmentType,
      difficulty,
      isPublished,
      isFree,
      coverImageUrl,
      gaugeStitches,
      gaugeRows,
      gaugeNeedleMm,
      gaugeNotes,
      isEdited, // Mark pattern as edited when user makes changes
    } = req.body;

    // Update slug if title changed
    let slug = pattern.slug;
    if (title && title !== pattern.title) {
      slug = slugify(title);
      const existing = await prisma.pattern.findFirst({
        where: {
          authorId: userId,
          slug,
          id: { not: id },
        },
      });
      if (existing) {
        throw new AppError('A pattern with this name already exists', 400);
      }
    }

    const updated = await prisma.pattern.update({
      where: { id },
      data: {
        title,
        slug,
        description,
        craftType,
        garmentType,
        difficulty,
        isPublished,
        publishedAt: isPublished && !pattern.publishedAt ? new Date() : pattern.publishedAt,
        isFree,
        coverImageUrl,
        gaugeStitches,
        gaugeRows,
        gaugeNeedleMm,
        gaugeNotes,
        // Mark as edited if user makes any changes (unless explicitly set to false)
        isEdited: isEdited !== undefined ? isEdited : (pattern.isEdited || true),
        // If edited, it's no longer the original cached version
        isOriginal: isEdited === true ? false : pattern.isOriginal,
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

    const pattern = await prisma.pattern.findUnique({
      where: { id },
    });

    if (!pattern) {
      throw new AppError('Pattern not found', 404);
    }

    if (pattern.authorId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    // Soft delete
    await prisma.pattern.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({
      success: true,
      message: 'Pattern deleted',
    });
  }

  async getSections(req: Request, res: Response) {
    const { id } = req.params;

    const sections = await prisma.patternSection.findMany({
      where: { patternId: id },
      include: {
        rows: { orderBy: { rowNumber: 'asc' } },
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
    const { name, sectionType, displayOrder, instructions, notes } = req.body;

    const pattern = await prisma.pattern.findUnique({
      where: { id },
    });

    if (!pattern || pattern.authorId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    const section = await prisma.patternSection.create({
      data: {
        patternId: id,
        name,
        sectionType,
        displayOrder,
        instructions,
        notes,
      },
    });

    res.status(201).json({
      success: true,
      data: section,
    });
  }

  async addRows(req: Request, res: Response) {
    const { id, sectionId } = req.params;
    const userId = req.user!.id;
    const { rows } = req.body; // Array of row objects

    const pattern = await prisma.pattern.findUnique({
      where: { id },
    });

    if (!pattern || pattern.authorId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    const createdRows = await prisma.patternRow.createMany({
      data: rows.map((row: any) => ({
        sectionId,
        ...row,
      })),
    });

    res.status(201).json({
      success: true,
      data: { count: createdRows.count },
    });
  }

  async getSizes(req: Request, res: Response) {
    const { id } = req.params;

    const sizes = await prisma.patternSize.findMany({
      where: { patternId: id },
      orderBy: { displayOrder: 'asc' },
    });

    res.json({
      success: true,
      data: sizes,
    });
  }

  async addSize(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;

    const pattern = await prisma.pattern.findUnique({
      where: { id },
    });

    if (!pattern || pattern.authorId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    const size = await prisma.patternSize.create({
      data: {
        patternId: id,
        ...req.body,
      },
    });

    res.status(201).json({
      success: true,
      data: size,
    });
  }

  async toggleFavorite(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.patternFavorite.findUnique({
      where: { userId_patternId: { userId, patternId: id } },
    });

    if (existing) {
      await prisma.patternFavorite.delete({
        where: { userId_patternId: { userId, patternId: id } },
      });
      await prisma.pattern.update({
        where: { id },
        data: { favoriteCount: { decrement: 1 } },
      });

      res.json({ success: true, data: { isFavorited: false } });
    } else {
      await prisma.patternFavorite.create({
        data: { userId, patternId: id },
      });
      await prisma.pattern.update({
        where: { id },
        data: { favoriteCount: { increment: 1 } },
      });

      res.json({ success: true, data: { isFavorited: true } });
    }
  }

  async getMyFavorites(req: Request, res: Response) {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [favorites, total] = await Promise.all([
      prisma.patternFavorite.findMany({
        where: { userId },
        include: {
          pattern: {
            include: {
              author: {
                select: { username: true, displayName: true, avatarUrl: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.patternFavorite.count({ where: { userId } }),
    ]);

    res.json({
      success: true,
      data: {
        items: favorites.map((f) => f.pattern),
        total,
        page,
        pageSize: limit,
        hasMore: total > page * limit,
      },
    });
  }
}

