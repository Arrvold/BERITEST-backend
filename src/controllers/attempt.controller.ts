import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

// GET /attempts  (admin view)
export const getAttempts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      id_session,
      id_user,
      status,
      page = '1',
      limit = '10',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;

    const whereClause: any = {};
    if (id_session) whereClause.id_session = parseInt(id_session as string, 10);
    if (id_user) whereClause.id_user = id_user as string;
    if (status) whereClause.status = status as string;

    const [attempts, total] = await Promise.all([
      prisma.trn_test_attempt.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          mst_users: { select: { id_user: true, nama_user: true, email: true } },
          trn_test_session: { select: { id_session: true, session_name: true } },
          mst_group_question: { select: { id_group: true, group_name: true } }
        }
      }),
      prisma.trn_test_attempt.count({ where: whereClause })
    ]);

    res.status(200).json({
      data: attempts,
      meta: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching attempts:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// GET /attempts/:id
export const getAttemptDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const attempt = await prisma.trn_test_attempt.findUnique({
      where: { id_test_attempt: id },
      include: {
        mst_users: { select: { id_user: true, nama_user: true, email: true } },
        trn_test_session: { select: { session_name: true, duration_minutes: true, passing_score: true } },
        mst_group_question: { select: { group_name: true } },
        trn_attempt_question: {
          orderBy: { question_order: 'asc' },
          include: {
            mst_question: {
              select: {
                id_question: true,
                question_desc: true,
                question_content_html: true,
                img_path: true,
                mst_answer: true
              }
            },
            trn_user_answer: {
              select: { id_answer_option: true, is_correct: true, answered_at: true }
            }
          }
        }
      }
    });

    if (!attempt) {
      res.status(404).json({ message: 'Attempt not found' });
      return;
    }

    res.status(200).json({ data: attempt });
  } catch (error) {
    console.error('Error fetching attempt detail:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// POST /attempts/start  — User starts a test
export const startAttempt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id_session, id_question_group } = req.body;
    const user_id = req.user?.id;

    // Validate session exists and is active
    const session = await prisma.trn_test_session.findUnique({ where: { id_session } });
    if (!session) {
      res.status(404).json({ message: 'Test session not found' });
      return;
    }
    if (session.status !== 'Active') {
      res.status(400).json({ message: `Test session is not active (current status: ${session.status})` });
      return;
    }

    // Validate group belongs to this session
    const sessionGroup = await prisma.trn_session_question_group.findFirst({
      where: { id_session, id_question_group }
    });
    if (!sessionGroup) {
      res.status(400).json({ message: 'This question group is not assigned to the given session' });
      return;
    }

    // Check if user already has an ongoing attempt for this session
    const ongoingAttempt = await prisma.trn_test_attempt.findFirst({
      where: { id_session, id_user: user_id, status: 'Ongoing' }
    });
    if (ongoingAttempt) {
      res.status(409).json({
        message: 'You already have an ongoing attempt for this session',
        data: { id_test_attempt: ongoingAttempt.id_test_attempt }
      });
      return;
    }

    // Fetch questions in the group
    const groupItems = await prisma.trn_question_group_item.findMany({
      where: { id_group: id_question_group },
      select: { id_question: true }
    });

    if (groupItems.length === 0) {
      res.status(400).json({ message: 'Question group has no questions' });
      return;
    }

    // Shuffle if session has random_question enabled
    let questionIds = groupItems.map(item => item.id_question);
    if (session.random_question) {
      questionIds = questionIds.sort(() => Math.random() - 0.5);
    }

    // Create attempt + attempt questions in a transaction
    const attempt = await prisma.$transaction(async (tx) => {
      const newAttempt = await tx.trn_test_attempt.create({
        data: {
          id_session,
          id_question_group,
          id_user: user_id,
          started_at: new Date(),
          status: 'Ongoing',
          total_correct: 0,
          total_wrong: 0,
          created_by: user_id
        }
      });

      await tx.trn_attempt_question.createMany({
        data: questionIds.map((qid, index) => ({
          id_test_attempt: newAttempt.id_test_attempt,
          id_question: qid,
          question_order: index + 1,
          time_spent_seconds: 0,
          is_answered: false,
          created_by: user_id
        }))
      });

      return newAttempt;
    });

    // Return attempt with questions (no correct answer revealed)
    const fullAttempt = await prisma.trn_test_attempt.findUnique({
      where: { id_test_attempt: attempt.id_test_attempt },
      include: {
        trn_attempt_question: {
          orderBy: { question_order: 'asc' },
          include: {
            mst_question: {
              select: {
                id_question: true,
                question_desc: true,
                question_content_html: true,
                question_content_json: true,
                img_path: true,
                mst_answer: {
                  select: {
                    id_answer: true,
                    answer_desc: true,
                    answer_content_html: true,
                    answer_content_json: true
                    // is_correct intentionally omitted for candidate view
                  }
                }
              }
            }
          }
        }
      }
    });

    res.status(201).json({ message: 'Test started successfully', data: fullAttempt });
  } catch (error) {
    console.error('Error starting attempt:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// POST /attempts/:id/submit  — User submits / auto-grading
export const submitAttempt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const user_id = req.user?.id;

    const attempt = await prisma.trn_test_attempt.findUnique({
      where: { id_test_attempt: id },
      include: {
        trn_attempt_question: {
          include: {
            trn_user_answer: { include: { mst_answer: { select: { is_correct: true } } } }
          }
        },
        trn_test_session: { select: { passing_score: true } }
      }
    });

    if (!attempt) {
      res.status(404).json({ message: 'Attempt not found' });
      return;
    }
    if (attempt.id_user !== user_id) {
      res.status(403).json({ message: 'Forbidden: This attempt does not belong to you' });
      return;
    }
    if (attempt.status !== 'Ongoing') {
      res.status(400).json({ message: `Attempt already ${attempt.status}` });
      return;
    }

    // Calculate score from answers
    let total_correct = 0;
    let total_wrong = 0;
    const totalQuestions = attempt.trn_attempt_question.length;

    for (const aq of attempt.trn_attempt_question) {
      if (aq.trn_user_answer.length > 0) {
        const lastAnswer = aq.trn_user_answer[aq.trn_user_answer.length - 1];
        if (lastAnswer.mst_answer?.is_correct) {
          total_correct++;
        } else {
          total_wrong++;
        }
      }
    }

    const score = totalQuestions > 0 ? (total_correct / totalQuestions) * 100 : 0;
    const submittedAt = new Date();
    const duration_seconds = attempt.started_at
      ? Math.floor((submittedAt.getTime() - attempt.started_at.getTime()) / 1000)
      : 0;

    const updatedAttempt = await prisma.trn_test_attempt.update({
      where: { id_test_attempt: id },
      data: {
        status: 'Submitted',
        submitted_at: submittedAt,
        duration_seconds,
        score,
        total_correct,
        total_wrong,
        updated_by: user_id,
        updated_at: new Date()
      }
    });

    // Update question analytics (total_attempts, total_wrong) in the background
    const updatePromises = attempt.trn_attempt_question.map(async (aq) => {
      if (!aq.id_question) return;
      const lastAnswer = aq.trn_user_answer[aq.trn_user_answer.length - 1];
      const isWrong = lastAnswer ? !lastAnswer.mst_answer?.is_correct : false;

      return prisma.mst_question.update({
        where: { id_question: aq.id_question },
        data: {
          total_attempts: { increment: 1 },
          total_wrong: isWrong ? { increment: 1 } : undefined
        }
      });
    });
    await Promise.all(updatePromises);

    res.status(200).json({
      message: 'Attempt submitted successfully',
      data: {
        id_test_attempt: updatedAttempt.id_test_attempt,
        score: updatedAttempt.score,
        total_correct,
        total_wrong,
        total_questions: totalQuestions,
        duration_seconds,
        passed: updatedAttempt.score !== null &&
          attempt.trn_test_session?.passing_score !== null &&
          Number(updatedAttempt.score) >= Number(attempt.trn_test_session?.passing_score)
      }
    });
  } catch (error) {
    console.error('Error submitting attempt:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// POST /attempts/:id/timeout  — Server-triggered timeout
export const timeoutAttempt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const attempt = await prisma.trn_test_attempt.findUnique({ where: { id_test_attempt: id } });
    if (!attempt) {
      res.status(404).json({ message: 'Attempt not found' });
      return;
    }
    if (attempt.status !== 'Ongoing') {
      res.status(400).json({ message: `Attempt is already ${attempt.status}` });
      return;
    }

    await prisma.trn_test_attempt.update({
      where: { id_test_attempt: id },
      data: {
        status: 'Timed-Out',
        submitted_at: new Date(),
        updated_at: new Date()
      }
    });

    res.status(200).json({ message: 'Attempt marked as Timed-Out' });
  } catch (error) {
    console.error('Error timing out attempt:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// POST /attempts/:id/questions/:questionId/answer  — Save/update user answer
export const saveAnswer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id_test_attempt = parseInt(req.params.id as string, 10);
    const id_test_attempt_question = parseInt(req.params.questionId as string, 10);
    const { id_answer_option, time_spent_seconds } = req.body;
    const user_id = req.user?.id;

    const attempt = await prisma.trn_test_attempt.findUnique({ where: { id_test_attempt } });
    if (!attempt) {
      res.status(404).json({ message: 'Attempt not found' });
      return;
    }
    if (attempt.id_user !== user_id) {
      res.status(403).json({ message: 'Forbidden: This attempt does not belong to you' });
      return;
    }
    if (attempt.status !== 'Ongoing') {
      res.status(400).json({ message: 'Cannot answer: attempt is not ongoing' });
      return;
    }

    // Validate the attempt_question belongs to this attempt
    const attemptQuestion = await prisma.trn_attempt_question.findFirst({
      where: { id_test_attempt_question, id_test_attempt }
    });
    if (!attemptQuestion) {
      res.status(404).json({ message: 'Attempt question not found for this attempt' });
      return;
    }

    // Validate the answer option belongs to the question
    const answer = await prisma.mst_answer.findFirst({
      where: { id_answer: id_answer_option, id_question: attemptQuestion.id_question }
    });
    if (!answer) {
      res.status(400).json({ message: 'Invalid answer option for this question' });
      return;
    }

    // Upsert: delete existing answer then insert fresh (allows answer change)
    await prisma.trn_user_answer.deleteMany({ where: { id_test_attempt_question } });
    const savedAnswer = await prisma.trn_user_answer.create({
      data: {
        id_test_attempt_question,
        id_answer_option,
        is_correct: answer.is_correct,
        answered_at: new Date(),
        created_by: user_id
      }
    });

    // Update is_answered + time_spent on attempt question
    await prisma.trn_attempt_question.update({
      where: { id_test_attempt_question },
      data: {
        is_answered: true,
        time_spent_seconds: time_spent_seconds !== undefined ? time_spent_seconds : attemptQuestion.time_spent_seconds,
        updated_at: new Date()
      }
    });

    res.status(200).json({ message: 'Answer saved successfully', data: { is_correct: answer.is_correct, savedAnswer } });
  } catch (error) {
    console.error('Error saving answer:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// PATCH /attempts/:id/questions/:questionId/time  — Update time spent on a question
export const updateTimeSpent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id_test_attempt = parseInt(req.params.id as string, 10);
    const id_test_attempt_question = parseInt(req.params.questionId as string, 10);
    const { time_spent_seconds } = req.body;
    const user_id = req.user?.id;

    const attempt = await prisma.trn_test_attempt.findUnique({ where: { id_test_attempt } });
    if (!attempt || attempt.id_user !== user_id) {
      res.status(404).json({ message: 'Attempt not found or access denied' });
      return;
    }
    if (attempt.status !== 'Ongoing') {
      res.status(400).json({ message: 'Cannot update time: attempt is not ongoing' });
      return;
    }

    const attemptQuestion = await prisma.trn_attempt_question.findFirst({
      where: { id_test_attempt_question, id_test_attempt }
    });
    if (!attemptQuestion) {
      res.status(404).json({ message: 'Attempt question not found' });
      return;
    }

    await prisma.trn_attempt_question.update({
      where: { id_test_attempt_question },
      data: { time_spent_seconds, updated_at: new Date() }
    });

    res.status(200).json({ message: 'Time updated successfully' });
  } catch (error) {
    console.error('Error updating time spent:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// GET /attempts/my  — Current user's own attempts
export const getMyAttempts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user_id = req.user?.id;
    const { page = '1', limit = '10' } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;

    const [attempts, total] = await Promise.all([
      prisma.trn_test_attempt.findMany({
        where: { id_user: user_id },
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        include: {
          trn_test_session: { select: { session_name: true, passing_score: true } },
          mst_group_question: { select: { group_name: true } }
        }
      }),
      prisma.trn_test_attempt.count({ where: { id_user: user_id } })
    ]);

    res.status(200).json({
      data: attempts,
      meta: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching my attempts:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
