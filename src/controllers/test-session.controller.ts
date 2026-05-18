import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

// GET /test-sessions
export const getTestSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, status, id_course, page = '1', limit = '10', sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;

    const whereClause: any = {};

    if (search) {
      whereClause.session_name = { contains: search as string, mode: 'insensitive' };
    }
    if (status) {
      whereClause.status = status;
    }
    if (id_course) {
      whereClause.id_course = parseInt(id_course as string, 10);
    }

    const [sessions, total] = await Promise.all([
      prisma.trn_test_session.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: {
          [sortBy as string]: sortOrder
        },
        include: {
          mst_course: { select: { course_title: true } },
          _count: {
            select: { trn_user_session_mapping: true } // Candidate count
          }
        }
      }),
      prisma.trn_test_session.count({ where: whereClause })
    ]);

    res.status(200).json({
      data: sessions,
      meta: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching test sessions:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// GET /test-sessions/summary
export const getTestSessionSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const activeSessionsCount = await prisma.trn_test_session.count({
      where: { status: 'Active' }
    });

    // Total participants assigned to ANY session (could refine to active sessions if needed)
    const totalParticipants = await prisma.trn_user_session_mapping.count();

    res.status(200).json({
      data: {
        total_active_sessions: activeSessionsCount,
        total_participants: totalParticipants
      }
    });
  } catch (error) {
    console.error('Error fetching test session summary:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// POST /test-sessions
export const createTestSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { 
      session_name, description, id_course, start_time, end_time, 
      duration_minutes, passing_score, random_question, random_answer, 
      is_seb_required, status, question_group_ids, participant_user_ids 
    } = req.body;
    const creator_id = req.user?.id;

    // Optional: Verify course if provided
    if (id_course) {
      const course = await prisma.mst_course.findUnique({ where: { id: id_course } });
      if (!course) {
        res.status(404).json({ message: 'Course not found' });
        return;
      }
    }

    const sessionData: any = {
      session_name,
      description,
      id_course,
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      duration_minutes,
      passing_score,
      random_question: random_question !== undefined ? random_question : true,
      random_answer: random_answer !== undefined ? random_answer : true,
      is_seb_required: is_seb_required !== undefined ? is_seb_required : false,
      status: status || 'Upcoming',
      created_by: creator_id
    };

    // Include nested creates if arrays are provided
    if (question_group_ids && question_group_ids.length > 0) {
      sessionData.trn_session_question_group = {
        create: question_group_ids.map((groupId: number) => ({
          id_question_group: groupId,
          created_by: creator_id
        }))
      };
    }

    if (participant_user_ids && participant_user_ids.length > 0) {
      sessionData.trn_user_session_mapping = {
        create: participant_user_ids.map((userId: string) => ({
          id_user: userId,
          end_date: new Date(end_time), // Set access end date same as session end time
          created_by: creator_id
        }))
      };
    }

    const newSession = await prisma.trn_test_session.create({
      data: sessionData,
      include: {
        trn_session_question_group: true,
        trn_user_session_mapping: true
      }
    });

    res.status(201).json({ message: 'Test session created successfully', data: newSession });
  } catch (error) {
    console.error('Error creating test session:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// GET /test-sessions/:id
export const getTestSessionDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const session = await prisma.trn_test_session.findUnique({
      where: { id_session: id },
      include: {
        mst_course: { select: { course_title: true } },
        trn_session_question_group: {
          include: {
            mst_group_question: { select: { id_group: true, group_name: true, description: true } }
          }
        },
        trn_user_session_mapping: {
          include: {
            mst_users: { select: { id_user: true, nama_user: true, email: true } }
          }
        }
      }
    });

    if (!session) {
      res.status(404).json({ message: 'Test session not found' });
      return;
    }

    res.status(200).json({ data: session });
  } catch (error) {
    console.error('Error fetching test session detail:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// PUT /test-sessions/:id
export const updateTestSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { 
      session_name, description, id_course, start_time, end_time, 
      duration_minutes, passing_score, random_question, random_answer, 
      is_seb_required, status 
    } = req.body;
    const updater_id = req.user?.id;

    const session = await prisma.trn_test_session.findUnique({ where: { id_session: id } });
    if (!session) {
      res.status(404).json({ message: 'Test session not found' });
      return;
    }

    if (id_course && id_course !== session.id_course) {
      const course = await prisma.mst_course.findUnique({ where: { id: id_course } });
      if (!course) {
        res.status(404).json({ message: 'Course not found' });
        return;
      }
    }

    const updatedSession = await prisma.trn_test_session.update({
      where: { id_session: id },
      data: {
        session_name: session_name || session.session_name,
        description: description !== undefined ? description : session.description,
        id_course: id_course || session.id_course,
        start_time: start_time ? new Date(start_time) : session.start_time,
        end_time: end_time ? new Date(end_time) : session.end_time,
        duration_minutes: duration_minutes !== undefined ? duration_minutes : session.duration_minutes,
        passing_score: passing_score !== undefined ? passing_score : session.passing_score,
        random_question: random_question !== undefined ? random_question : session.random_question,
        random_answer: random_answer !== undefined ? random_answer : session.random_answer,
        is_seb_required: is_seb_required !== undefined ? is_seb_required : session.is_seb_required,
        status: status || session.status,
        updated_by: updater_id,
        updated_at: new Date()
      }
    });

    res.status(200).json({ message: 'Test session updated successfully', data: updatedSession });
  } catch (error) {
    console.error('Error updating test session:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// DELETE /test-sessions/:id
export const deleteTestSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const updater_id = req.user?.id;

    const session = await prisma.trn_test_session.findUnique({ where: { id_session: id } });
    if (!session) {
      res.status(404).json({ message: 'Test session not found' });
      return;
    }

    // Since we don't have is_active, updating status to Cancelled serves as soft delete
    await prisma.trn_test_session.update({
      where: { id_session: id },
      data: { 
        status: 'Cancelled',
        updated_by: updater_id,
        updated_at: new Date()
      }
    });

    res.status(200).json({ message: 'Test session cancelled successfully' });
  } catch (error) {
    console.error('Error deleting test session:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// POST /test-sessions/:id/assign-groups
export const assignQuestionGroups = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { question_group_ids } = req.body;
    const creator_id = req.user?.id;

    const session = await prisma.trn_test_session.findUnique({ where: { id_session: id } });
    if (!session) {
      res.status(404).json({ message: 'Test session not found' });
      return;
    }

    // Check existing mapping
    const existing = await prisma.trn_session_question_group.findMany({
      where: {
        id_session: id,
        id_question_group: { in: question_group_ids }
      }
    });

    const existingGroupIds = existing.map(e => e.id_question_group);
    const newGroupIds = question_group_ids.filter((gid: number) => !existingGroupIds.includes(gid));

    if (newGroupIds.length === 0) {
      res.status(200).json({ message: 'All provided question groups are already assigned to this session' });
      return;
    }

    await prisma.trn_session_question_group.createMany({
      data: newGroupIds.map((groupId: number) => ({
        id_session: id,
        id_question_group: groupId,
        created_by: creator_id
      }))
    });

    res.status(201).json({ 
      message: `Successfully assigned ${newGroupIds.length} question groups to the session`,
      assigned_groups: newGroupIds
    });
  } catch (error) {
    console.error('Error assigning question groups:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// POST /test-sessions/:id/assign-participants
export const assignParticipants = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { participant_user_ids } = req.body;
    const creator_id = req.user?.id;

    const session = await prisma.trn_test_session.findUnique({ where: { id_session: id } });
    if (!session) {
      res.status(404).json({ message: 'Test session not found' });
      return;
    }

    const existing = await prisma.trn_user_session_mapping.findMany({
      where: {
        id_session: id,
        id_user: { in: participant_user_ids }
      }
    });

    const existingUserIds = existing.map(e => e.id_user);
    const newUserIds = participant_user_ids.filter((uid: string) => !existingUserIds.includes(uid));

    if (newUserIds.length === 0) {
      res.status(200).json({ message: 'All provided users are already assigned to this session' });
      return;
    }

    await prisma.trn_user_session_mapping.createMany({
      data: newUserIds.map((userId: string) => ({
        id_session: id,
        id_user: userId,
        end_date: session.end_time, // Assign access until session ends
        created_by: creator_id
      }))
    });

    res.status(201).json({ 
      message: `Successfully assigned ${newUserIds.length} participants to the session`,
      assigned_participants: newUserIds
    });
  } catch (error) {
    console.error('Error assigning participants:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};
