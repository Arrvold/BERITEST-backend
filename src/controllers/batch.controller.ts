import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

// GET /batches
export const getBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, id_course, page = '1', limit = '10', sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;

    const whereClause: any = {};

    if (search) {
      whereClause.nama_batch = { contains: search as string, mode: 'insensitive' };
    }
    
    if (id_course) {
      whereClause.id_course = parseInt(id_course as string, 10);
    }

    const [batches, total] = await Promise.all([
      prisma.mst_batch.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: {
          [sortBy as string]: sortOrder
        },
        include: {
          mst_course: { select: { course_title: true } },
          _count: {
            select: { trn_batch_user: true } // Number of participants
          }
        }
      }),
      prisma.mst_batch.count({ where: whereClause })
    ]);

    res.status(200).json({
      data: batches,
      meta: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// GET /batches/summary
export const getBatchSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const activeBatchesCount = await prisma.mst_batch.count({
      where: { is_active: true }
    });

    const totalParticipants = await prisma.trn_batch_user.count({
      where: { mst_batch: { is_active: true } }
    });

    res.status(200).json({
      data: {
        total_active_batches: activeBatchesCount,
        total_participants: totalParticipants
      }
    });
  } catch (error) {
    console.error('Error fetching batch summary:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// POST /batches
export const createBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id_course, nama_batch, start_date, end_date, is_active } = req.body;
    const creator_id = req.user?.id;

    // Verify course exists
    const course = await prisma.mst_course.findUnique({ where: { id: id_course } });
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    const newBatch = await prisma.mst_batch.create({
      data: {
        id_course,
        nama_batch,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        is_active: is_active !== undefined ? is_active : true,
        created_by: creator_id
      }
    });

    res.status(201).json({ message: 'Batch created successfully', data: newBatch });
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// GET /batches/:id
export const getBatchDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const batch = await prisma.mst_batch.findUnique({
      where: { id_batch: id },
      include: {
        mst_course: { 
          select: { 
            course_title: true,
            trn_test_session: {
              select: {
                id_session: true,
                session_name: true,
                start_time: true,
                end_time: true,
                status: true
              }
            }
          } 
        },
        trn_batch_user: {
          include: {
            mst_users: { select: { id_user: true, nama_user: true, email: true } }
          }
        }
      }
    });

    if (!batch) {
      res.status(404).json({ message: 'Batch not found' });
      return;
    }

    res.status(200).json({ data: batch });
  } catch (error) {
    console.error('Error fetching batch detail:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// PUT /batches/:id
export const updateBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { id_course, nama_batch, start_date, end_date, is_active } = req.body;
    const updater_id = req.user?.id;

    const batch = await prisma.mst_batch.findUnique({ where: { id_batch: id } });
    if (!batch) {
      res.status(404).json({ message: 'Batch not found' });
      return;
    }

    if (id_course && id_course !== batch.id_course) {
      const course = await prisma.mst_course.findUnique({ where: { id: id_course } });
      if (!course) {
        res.status(404).json({ message: 'Course not found' });
        return;
      }
    }

    const updatedBatch = await prisma.mst_batch.update({
      where: { id_batch: id },
      data: {
        id_course: id_course || batch.id_course,
        nama_batch: nama_batch || batch.nama_batch,
        start_date: start_date ? new Date(start_date) : batch.start_date,
        end_date: end_date ? new Date(end_date) : batch.end_date,
        is_active: is_active !== undefined ? is_active : batch.is_active,
        updated_by: updater_id,
        updated_at: new Date()
      }
    });

    res.status(200).json({ message: 'Batch updated successfully', data: updatedBatch });
  } catch (error) {
    console.error('Error updating batch:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// DELETE /batches/:id
export const deleteBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const updater_id = req.user?.id;

    const batch = await prisma.mst_batch.findUnique({ where: { id_batch: id } });
    if (!batch) {
      res.status(404).json({ message: 'Batch not found' });
      return;
    }

    // Soft delete
    await prisma.mst_batch.update({
      where: { id_batch: id },
      data: { 
        is_active: false,
        updated_by: updater_id,
        updated_at: new Date()
      }
    });

    res.status(200).json({ message: 'Batch deleted (deactivated) successfully' });
  } catch (error) {
    console.error('Error deleting batch:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// POST /batches/:id/assign-users
export const assignUsersToBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { user_ids } = req.body; // Array of user UUIDs
    const creator_id = req.user?.id;

    const batch = await prisma.mst_batch.findUnique({ where: { id_batch: id } });
    if (!batch) {
      res.status(404).json({ message: 'Batch not found' });
      return;
    }

    // Verify all users exist
    const users = await prisma.mst_users.findMany({
      where: { id_user: { in: user_ids } }
    });

    if (users.length !== user_ids.length) {
      res.status(400).json({ message: 'One or more user IDs are invalid' });
      return;
    }

    // Find existing assignments to avoid duplicates
    const existingAssignments = await prisma.trn_batch_user.findMany({
      where: {
        id_batch: id,
        id_user: { in: user_ids }
      }
    });

    const existingUserIds = existingAssignments.map(a => a.id_user);
    const newUserIds = user_ids.filter((id: string) => !existingUserIds.includes(id));

    if (newUserIds.length === 0) {
      res.status(200).json({ message: 'All provided users are already assigned to this batch' });
      return;
    }

    // Create new assignments
    await prisma.trn_batch_user.createMany({
      data: newUserIds.map((userId: string) => ({
        id_batch: id,
        id_user: userId,
        status: 'Registered', // Default status
        joined_at: new Date(),
        created_by: creator_id
      }))
    });

    res.status(201).json({ 
      message: `Successfully assigned ${newUserIds.length} users to the batch`,
      assigned_users: newUserIds
    });
  } catch (error) {
    console.error('Error assigning users to batch:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// DELETE /batches/:id/remove-users
export const removeUsersFromBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { user_ids } = req.body; // Array of user UUIDs

    const batch = await prisma.mst_batch.findUnique({ where: { id_batch: id } });
    if (!batch) {
      res.status(404).json({ message: 'Batch not found' });
      return;
    }

    await prisma.trn_batch_user.deleteMany({
      where: {
        id_batch: id,
        id_user: { in: user_ids }
      }
    });

    res.status(200).json({ 
      message: `Successfully removed users from the batch`,
      removed_users: user_ids
    });
  } catch (error) {
    console.error('Error removing users from batch:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

