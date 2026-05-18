import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

// GET /courses
export const getCourses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, page = '1', limit = '10', sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { course_title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [courses, total] = await Promise.all([
      prisma.mst_course.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: {
          [sortBy as string]: sortOrder
        },
        include: {
          mst_users: { select: { nama_user: true } }, // Creator info
          _count: {
            select: { mst_batch: true } // Count of batches assigned to this course
          }
        }
      }),
      prisma.mst_course.count({ where: whereClause })
    ]);

    res.status(200).json({
      data: courses,
      meta: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// POST /courses
export const createCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { course_title, description, is_active } = req.body;
    
    // Get creator_id from the authenticated user token
    const creator_id = req.user?.id;

    const newCourse = await prisma.mst_course.create({
      data: {
        course_title,
        description,
        is_active: is_active !== undefined ? is_active : true,
        creator_id,
        created_by: creator_id
      }
    });

    res.status(201).json({ message: 'Course created successfully', data: newCourse });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// GET /courses/:id
export const getCourseDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const course = await prisma.mst_course.findUnique({
      where: { id },
      include: {
        mst_users: { select: { nama_user: true, email: true } }, // Creator details
        mst_batch: {
          select: {
            id_batch: true,
            nama_batch: true,
            start_date: true,
            end_date: true,
            is_active: true,
            _count: {
              select: { trn_batch_user: true } // Participants per batch
            }
          }
        },
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
    });

    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    res.status(200).json({ data: course });
  } catch (error) {
    console.error('Error fetching course detail:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// PUT /courses/:id
export const updateCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { course_title, description, is_active } = req.body;
    const updater_id = req.user?.id;

    const course = await prisma.mst_course.findUnique({ where: { id } });
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    const updatedCourse = await prisma.mst_course.update({
      where: { id },
      data: {
        course_title: course_title || course.course_title,
        description: description !== undefined ? description : course.description,
        is_active: is_active !== undefined ? is_active : course.is_active,
        updated_by: updater_id,
        updated_at: new Date()
      }
    });

    res.status(200).json({ message: 'Course updated successfully', data: updatedCourse });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// DELETE /courses/:id
export const deleteCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const updater_id = req.user?.id;

    const course = await prisma.mst_course.findUnique({ where: { id } });
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    // Soft delete: set is_active to false
    await prisma.mst_course.update({
      where: { id },
      data: { 
        is_active: false,
        updated_by: updater_id,
        updated_at: new Date()
      }
    });

    res.status(200).json({ message: 'Course deleted (deactivated) successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// GET /courses/:id/batches
export const getCourseBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const batches = await prisma.mst_batch.findMany({
      where: { id_course: id },
      include: {
        _count: {
          select: { trn_batch_user: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    res.status(200).json({ data: batches });
  } catch (error) {
    console.error('Error fetching course batches:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};
