import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

// GET /question-groups
export const getQuestionGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, page = '1', limit = '10', sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;

    const whereClause: any = {};
    if (search) {
      whereClause.group_name = { contains: search as string, mode: 'insensitive' };
    }

    const [groups, total] = await Promise.all([
      prisma.mst_group_question.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          _count: { select: { trn_question_group_item: true } }
        }
      }),
      prisma.mst_group_question.count({ where: whereClause })
    ]);

    res.status(200).json({
      data: groups,
      meta: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching question groups:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// GET /question-groups/:id
export const getQuestionGroupDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const group = await prisma.mst_group_question.findUnique({
      where: { id_group: id },
      include: {
        trn_question_group_item: {
          include: {
            mst_question: {
              include: {
                trn_question_position: {
                  include: { mst_position: { select: { id_position: true, position_name: true } } }
                }
              }
            }
          }
        }
      }
    });

    if (!group) {
      res.status(404).json({ message: 'Question group not found' });
      return;
    }

    res.status(200).json({ data: group });
  } catch (error) {
    console.error('Error fetching question group detail:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// POST /question-groups
export const createQuestionGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { group_name, description, question_ids } = req.body;
    const creator_id = req.user?.id;

    // Validate question_ids if provided
    if (question_ids && question_ids.length > 0) {
      const questions = await prisma.mst_question.findMany({
        where: { id_question: { in: question_ids } }
      });
      if (questions.length !== question_ids.length) {
        res.status(400).json({ message: 'One or more question IDs are invalid' });
        return;
      }
    }

    const groupData: any = {
      group_name,
      description: description || undefined,
      created_by: creator_id
    };

    if (question_ids && question_ids.length > 0) {
      groupData.trn_question_group_item = {
        create: question_ids.map((qid: number) => ({
          id_question: qid,
          created_by: creator_id
        }))
      };
    }

    const newGroup = await prisma.mst_group_question.create({
      data: groupData,
      include: {
        trn_question_group_item: {
          include: { mst_question: { select: { id_question: true, question_desc: true } } }
        }
      }
    });

    res.status(201).json({ message: 'Question group created successfully', data: newGroup });
  } catch (error) {
    console.error('Error creating question group:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// PUT /question-groups/:id
export const updateQuestionGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { group_name, description } = req.body;
    const updater_id = req.user?.id;

    const group = await prisma.mst_group_question.findUnique({ where: { id_group: id } });
    if (!group) {
      res.status(404).json({ message: 'Question group not found' });
      return;
    }

    const updatedGroup = await prisma.mst_group_question.update({
      where: { id_group: id },
      data: {
        group_name: group_name || group.group_name,
        description: description !== undefined ? description : group.description,
        updated_by: updater_id,
        updated_at: new Date()
      }
    });

    res.status(200).json({ message: 'Question group updated successfully', data: updatedGroup });
  } catch (error) {
    console.error('Error updating question group:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// DELETE /question-groups/:id
export const deleteQuestionGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const group = await prisma.mst_group_question.findUnique({ where: { id_group: id } });
    if (!group) {
      res.status(404).json({ message: 'Question group not found' });
      return;
    }

    // Check if this group is used in any test session
    const sessionCount = await prisma.trn_session_question_group.count({ where: { id_question_group: id } });
    if (sessionCount > 0) {
      res.status(409).json({
        message: `Cannot delete group. It is assigned to ${sessionCount} test session(s).`
      });
      return;
    }

    await prisma.$transaction([
      prisma.trn_question_group_item.deleteMany({ where: { id_group: id } }),
      prisma.mst_group_question.delete({ where: { id_group: id } }),
    ]);

    res.status(200).json({ message: 'Question group deleted successfully' });
  } catch (error) {
    console.error('Error deleting question group:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// POST /question-groups/:id/add-questions
export const addQuestionsToGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { question_ids } = req.body;
    const creator_id = req.user?.id;

    const group = await prisma.mst_group_question.findUnique({ where: { id_group: id } });
    if (!group) {
      res.status(404).json({ message: 'Question group not found' });
      return;
    }

    const questions = await prisma.mst_question.findMany({
      where: { id_question: { in: question_ids } }
    });
    if (questions.length !== question_ids.length) {
      res.status(400).json({ message: 'One or more question IDs are invalid' });
      return;
    }

    // Find already-existing items to prevent duplicates
    const existing = await prisma.trn_question_group_item.findMany({
      where: { id_group: id, id_question: { in: question_ids } }
    });
    const existingQids = existing.map(e => e.id_question);
    const newQids = question_ids.filter((qid: number) => !existingQids.includes(qid));

    if (newQids.length === 0) {
      res.status(200).json({ message: 'All provided questions are already in this group' });
      return;
    }

    await prisma.trn_question_group_item.createMany({
      data: newQids.map((qid: number) => ({
        id_group: id,
        id_question: qid,
        created_by: creator_id
      }))
    });

    res.status(201).json({
      message: `Successfully added ${newQids.length} question(s) to the group`,
      added_questions: newQids
    });
  } catch (error) {
    console.error('Error adding questions to group:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// DELETE /question-groups/:id/questions/:questionId
export const removeQuestionFromGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const questionId = parseInt(req.params.questionId as string, 10);

    const item = await prisma.trn_question_group_item.findFirst({
      where: { id_group: id, id_question: questionId }
    });
    if (!item) {
      res.status(404).json({ message: 'Question not found in this group' });
      return;
    }

    await prisma.trn_question_group_item.delete({ where: { id_group_question: item.id_group_question } });

    res.status(200).json({ message: 'Question removed from group successfully' });
  } catch (error) {
    console.error('Error removing question from group:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// POST /question-groups/:id/randomize
// Randomly fill the group from the pool based on total count and optional position quotas
export const randomizeGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { total_questions, position_quotas } = req.body;
    const creator_id = req.user?.id;

    const group = await prisma.mst_group_question.findUnique({ where: { id_group: id } });
    if (!group) {
      res.status(404).json({ message: 'Question group not found' });
      return;
    }

    let selectedQuestionIds: number[] = [];

    if (position_quotas && position_quotas.length > 0) {
      // Validate quotas sum to 100%
      const totalPct = position_quotas.reduce((sum: number, q: any) => sum + q.percentage, 0);
      if (totalPct !== 100) {
        res.status(400).json({ message: 'Position quotas must sum to exactly 100%' });
        return;
      }

      for (const quota of position_quotas) {
        const count = Math.round((quota.percentage / 100) * total_questions);
        if (count === 0) continue;

        const pool = await prisma.mst_question.findMany({
          where: {
            trn_question_position: { some: { id_position: quota.id_position } }
          },
          select: { id_question: true }
        });

        if (pool.length < count) {
          res.status(400).json({
            message: `Not enough questions for position ID ${quota.id_position}. Needed ${count}, available ${pool.length}.`
          });
          return;
        }

        // Fisher-Yates shuffle then take `count`
        const shuffled = pool.map(q => q.id_question).sort(() => Math.random() - 0.5);
        selectedQuestionIds.push(...shuffled.slice(0, count));
      }
    } else {
      // No position filter – pick from entire pool
      const pool = await prisma.mst_question.findMany({ select: { id_question: true } });
      if (pool.length < total_questions) {
        res.status(400).json({
          message: `Not enough questions in pool. Needed ${total_questions}, available ${pool.length}.`
        });
        return;
      }
      const shuffled = pool.map(q => q.id_question).sort(() => Math.random() - 0.5);
      selectedQuestionIds = shuffled.slice(0, total_questions);
    }

    // Remove duplicates (rounding may cause overlap)
    selectedQuestionIds = [...new Set(selectedQuestionIds)];

    // Replace all items in the group
    await prisma.trn_question_group_item.deleteMany({ where: { id_group: id } });
    await prisma.trn_question_group_item.createMany({
      data: selectedQuestionIds.map(qid => ({
        id_group: id,
        id_question: qid,
        created_by: creator_id
      }))
    });

    res.status(200).json({
      message: `Group randomized successfully with ${selectedQuestionIds.length} questions`,
      total_added: selectedQuestionIds.length
    });
  } catch (error) {
    console.error('Error randomizing group:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
