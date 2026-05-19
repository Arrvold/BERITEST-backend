import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

// GET /questions
export const getQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      difficulty_flag,
      id_position,
      page = '1',
      limit = '10',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;

    const whereClause: any = {};

    if (search) {
      whereClause.question_desc = { contains: search as string, mode: 'insensitive' };
    }
    if (difficulty_flag) {
      whereClause.difficulty_flag = difficulty_flag;
    }
    if (id_position) {
      whereClause.trn_question_position = {
        some: { id_position: parseInt(id_position as string, 10) }
      };
    }

    const [questions, total] = await Promise.all([
      prisma.mst_question.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          trn_question_position: {
            include: { mst_position: { select: { id_position: true, position_name: true } } }
          },
          _count: { select: { mst_answer: true } }
        }
      }),
      prisma.mst_question.count({ where: whereClause })
    ]);

    res.status(200).json({
      data: questions,
      meta: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// GET /questions/summary
export const getQuestionSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const [total, easy, medium, hard] = await Promise.all([
      prisma.mst_question.count(),
      prisma.mst_question.count({ where: { difficulty_flag: 'Easy' } }),
      prisma.mst_question.count({ where: { difficulty_flag: 'Medium' } }),
      prisma.mst_question.count({ where: { difficulty_flag: 'Hard' } }),
    ]);

    res.status(200).json({
      data: { total, easy, medium, hard }
    });
  } catch (error) {
    console.error('Error fetching question summary:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// GET /questions/:id
export const getQuestionDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const question = await prisma.mst_question.findUnique({
      where: { id_question: id },
      include: {
        mst_answer: true,
        trn_question_position: {
          include: { mst_position: { select: { id_position: true, position_name: true } } }
        }
      }
    });

    if (!question) {
      res.status(404).json({ message: 'Question not found' });
      return;
    }

    res.status(200).json({ data: question });
  } catch (error) {
    console.error('Error fetching question detail:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// POST /questions
export const createQuestion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      question_desc,
      question_content_json,
      question_content_html,
      img_path,
      difficulty_flag,
      position_ids,
      answers
    } = req.body;
    const creator_id = req.user?.id;

    // Validate position_ids if provided
    if (position_ids && position_ids.length > 0) {
      const positions = await prisma.mst_position.findMany({
        where: { id_position: { in: position_ids } }
      });
      if (positions.length !== position_ids.length) {
        res.status(400).json({ message: 'One or more position IDs are invalid' });
        return;
      }
    }

    const questionData: any = {
      question_desc,
      question_content_json: question_content_json || undefined,
      question_content_html: question_content_html || undefined,
      img_path: img_path || undefined,
      difficulty_flag: difficulty_flag || 'Medium',
      total_attempts: 0,
      total_wrong: 0,
      created_by: creator_id,
    };

    if (answers && answers.length > 0) {
      questionData.mst_answer = {
        create: answers.map((a: any) => ({
          answer_desc: a.answer_desc,
          answer_content_json: a.answer_content_json || undefined,
          answer_content_html: a.answer_content_html || undefined,
          is_correct: a.is_correct ?? false,
          created_by: creator_id
        }))
      };
    }

    if (position_ids && position_ids.length > 0) {
      questionData.trn_question_position = {
        create: position_ids.map((pid: number) => ({
          id_position: pid,
          created_by: creator_id
        }))
      };
    }

    const newQuestion = await prisma.mst_question.create({
      data: questionData,
      include: {
        mst_answer: true,
        trn_question_position: {
          include: { mst_position: { select: { id_position: true, position_name: true } } }
        }
      }
    });

    res.status(201).json({ message: 'Question created successfully', data: newQuestion });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// PUT /questions/:id
export const updateQuestion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const {
      question_desc,
      question_content_json,
      question_content_html,
      img_path,
      difficulty_flag,
      position_ids
    } = req.body;
    const updater_id = req.user?.id;

    const question = await prisma.mst_question.findUnique({ where: { id_question: id } });
    if (!question) {
      res.status(404).json({ message: 'Question not found' });
      return;
    }

    const updatedQuestion = await prisma.mst_question.update({
      where: { id_question: id },
      data: {
        question_desc: question_desc || question.question_desc,
        question_content_json: question_content_json !== undefined ? question_content_json : question.question_content_json,
        question_content_html: question_content_html !== undefined ? question_content_html : question.question_content_html,
        img_path: img_path !== undefined ? img_path : question.img_path,
        difficulty_flag: difficulty_flag || question.difficulty_flag,
        updated_by: updater_id,
        updated_at: new Date()
      }
    });

    // If position_ids provided, replace all mappings
    if (position_ids !== undefined) {
      if (position_ids.length > 0) {
        const positions = await prisma.mst_position.findMany({
          where: { id_position: { in: position_ids } }
        });
        if (positions.length !== position_ids.length) {
          res.status(400).json({ message: 'One or more position IDs are invalid' });
          return;
        }
      }

      await prisma.trn_question_position.deleteMany({ where: { id_question: id } });

      if (position_ids.length > 0) {
        await prisma.trn_question_position.createMany({
          data: position_ids.map((pid: number) => ({
            id_question: id,
            id_position: pid,
            created_by: updater_id
          }))
        });
      }
    }

    const result = await prisma.mst_question.findUnique({
      where: { id_question: id },
      include: {
        mst_answer: true,
        trn_question_position: {
          include: { mst_position: { select: { id_position: true, position_name: true } } }
        }
      }
    });

    res.status(200).json({ message: 'Question updated successfully', data: result });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// DELETE /questions/:id
export const deleteQuestion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const question = await prisma.mst_question.findUnique({ where: { id_question: id } });
    if (!question) {
      res.status(404).json({ message: 'Question not found' });
      return;
    }

    // Check if question is referenced in any attempt
    const attemptCount = await prisma.trn_attempt_question.count({ where: { id_question: id } });
    if (attemptCount > 0) {
      res.status(409).json({
        message: `Cannot delete question. It has been used in ${attemptCount} attempt(s).`
      });
      return;
    }

    // Cascade delete: answers, position mappings, group items
    await prisma.$transaction([
      prisma.trn_question_group_item.deleteMany({ where: { id_question: id } }),
      prisma.trn_question_position.deleteMany({ where: { id_question: id } }),
      prisma.mst_answer.deleteMany({ where: { id_question: id } }),
      prisma.mst_question.delete({ where: { id_question: id } }),
    ]);

    res.status(200).json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// ── ANSWER sub-routes ──────────────────────────────────────────────────────────

// POST /questions/:id/answers
export const createAnswer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id_question = parseInt(req.params.id as string, 10);
    const { answer_desc, answer_content_json, answer_content_html, is_correct } = req.body;
    const creator_id = req.user?.id;

    const question = await prisma.mst_question.findUnique({ where: { id_question } });
    if (!question) {
      res.status(404).json({ message: 'Question not found' });
      return;
    }

    const newAnswer = await prisma.mst_answer.create({
      data: {
        id_question,
        answer_desc,
        answer_content_json: answer_content_json || undefined,
        answer_content_html: answer_content_html || undefined,
        is_correct: is_correct ?? false,
        created_by: creator_id
      }
    });

    res.status(201).json({ message: 'Answer created successfully', data: newAnswer });
  } catch (error) {
    console.error('Error creating answer:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// PUT /questions/:id/answers/:answerId
export const updateAnswer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id_question = parseInt(req.params.id as string, 10);
    const id_answer = parseInt(req.params.answerId as string, 10);
    const { answer_desc, answer_content_json, answer_content_html, is_correct } = req.body;
    const updater_id = req.user?.id;

    const answer = await prisma.mst_answer.findFirst({
      where: { id_answer, id_question }
    });
    if (!answer) {
      res.status(404).json({ message: 'Answer not found for this question' });
      return;
    }

    const updatedAnswer = await prisma.mst_answer.update({
      where: { id_answer },
      data: {
        answer_desc: answer_desc || answer.answer_desc,
        answer_content_json: answer_content_json !== undefined ? answer_content_json : answer.answer_content_json,
        answer_content_html: answer_content_html !== undefined ? answer_content_html : answer.answer_content_html,
        is_correct: is_correct !== undefined ? is_correct : answer.is_correct,
        updated_by: updater_id,
        updated_at: new Date()
      }
    });

    res.status(200).json({ message: 'Answer updated successfully', data: updatedAnswer });
  } catch (error) {
    console.error('Error updating answer:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// DELETE /questions/:id/answers/:answerId
export const deleteAnswer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id_question = parseInt(req.params.id as string, 10);
    const id_answer = parseInt(req.params.answerId as string, 10);

    const answer = await prisma.mst_answer.findFirst({ where: { id_answer, id_question } });
    if (!answer) {
      res.status(404).json({ message: 'Answer not found for this question' });
      return;
    }

    await prisma.mst_answer.delete({ where: { id_answer } });

    res.status(200).json({ message: 'Answer deleted successfully' });
  } catch (error) {
    console.error('Error deleting answer:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// ── POSITION MAPPING ──────────────────────────────────────────────────────────

// POST /questions/:id/map-positions  (replaces current mapping)
export const mapPositions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id_question = parseInt(req.params.id as string, 10);
    const { position_ids } = req.body;
    const creator_id = req.user?.id;

    const question = await prisma.mst_question.findUnique({ where: { id_question } });
    if (!question) {
      res.status(404).json({ message: 'Question not found' });
      return;
    }

    const positions = await prisma.mst_position.findMany({
      where: { id_position: { in: position_ids } }
    });
    if (positions.length !== position_ids.length) {
      res.status(400).json({ message: 'One or more position IDs are invalid' });
      return;
    }

    await prisma.trn_question_position.deleteMany({ where: { id_question } });
    await prisma.trn_question_position.createMany({
      data: position_ids.map((pid: number) => ({
        id_question,
        id_position: pid,
        created_by: creator_id
      }))
    });

    res.status(200).json({ message: 'Position mapping updated successfully' });
  } catch (error) {
    console.error('Error mapping positions:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
