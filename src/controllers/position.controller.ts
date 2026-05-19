import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

// GET /positions
export const getPositions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, page = '1', limit = '10', sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;

    const whereClause: any = {};
    if (search) {
      whereClause.position_name = { contains: search as string, mode: 'insensitive' };
    }

    const [positions, total] = await Promise.all([
      prisma.mst_position.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          _count: {
            select: { trn_question_position: true }
          }
        }
      }),
      prisma.mst_position.count({ where: whereClause })
    ]);

    res.status(200).json({
      data: positions,
      meta: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// GET /positions/:id
export const getPositionDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const position = await prisma.mst_position.findUnique({
      where: { id_position: id },
      include: {
        trn_question_position: {
          include: {
            mst_question: {
              select: { id_question: true, question_desc: true, difficulty_flag: true }
            }
          }
        }
      }
    });

    if (!position) {
      res.status(404).json({ message: 'Position not found' });
      return;
    }

    res.status(200).json({ data: position });
  } catch (error) {
    console.error('Error fetching position detail:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// POST /positions
export const createPosition = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { position_name } = req.body;
    const creator_id = req.user?.id;

    // Check for duplicate
    const existing = await prisma.mst_position.findFirst({
      where: { position_name: { equals: position_name, mode: 'insensitive' } }
    });
    if (existing) {
      res.status(409).json({ message: 'Position with this name already exists' });
      return;
    }

    const newPosition = await prisma.mst_position.create({
      data: {
        position_name,
        created_by: creator_id
      }
    });

    res.status(201).json({ message: 'Position created successfully', data: newPosition });
  } catch (error) {
    console.error('Error creating position:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// PUT /positions/:id
export const updatePosition = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { position_name } = req.body;
    const updater_id = req.user?.id;

    const position = await prisma.mst_position.findUnique({ where: { id_position: id } });
    if (!position) {
      res.status(404).json({ message: 'Position not found' });
      return;
    }

    if (position_name && position_name !== position.position_name) {
      const duplicate = await prisma.mst_position.findFirst({
        where: { position_name: { equals: position_name, mode: 'insensitive' } }
      });
      if (duplicate) {
        res.status(409).json({ message: 'Position with this name already exists' });
        return;
      }
    }

    const updatedPosition = await prisma.mst_position.update({
      where: { id_position: id },
      data: {
        position_name: position_name || position.position_name,
        updated_by: updater_id,
        updated_at: new Date()
      }
    });

    res.status(200).json({ message: 'Position updated successfully', data: updatedPosition });
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// DELETE /positions/:id
export const deletePosition = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const position = await prisma.mst_position.findUnique({ where: { id_position: id } });
    if (!position) {
      res.status(404).json({ message: 'Position not found' });
      return;
    }

    // Check if position is used in any question mapping
    const usedCount = await prisma.trn_question_position.count({ where: { id_position: id } });
    if (usedCount > 0) {
      res.status(409).json({
        message: `Cannot delete position. It is currently tagged to ${usedCount} question(s).`
      });
      return;
    }

    await prisma.mst_position.delete({ where: { id_position: id } });

    res.status(200).json({ message: 'Position deleted successfully' });
  } catch (error) {
    console.error('Error deleting position:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
