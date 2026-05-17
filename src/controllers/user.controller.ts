import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import * as xlsx from 'xlsx';
import prisma from '../utils/prisma';

// Helper function to generate a random password
const generateRandomPassword = () => Math.random().toString(36).slice(-8);

// GET /users
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, page = '1', limit = '10', sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;

    const whereClause: any = {
      is_active: true, // Only fetch active users by default
    };

    if (search) {
      whereClause.OR = [
        { nama_user: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.mst_users.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: {
          [sortBy as string]: sortOrder
        },
        select: {
          id_user: true,
          nama_user: true,
          email: true,
          is_active: true,
          mst_role: { select: { name_role: true } }
        }
      }),
      prisma.mst_users.count({ where: whereClause })
    ]);

    res.status(200).json({
      data: users,
      meta: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// POST /users
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nama_user, email, id_role, position_ids } = req.body;

    if (!nama_user || !email) {
      res.status(400).json({ message: 'Name and email are required' });
      return;
    }

    const existingUser = await prisma.mst_users.findFirst({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: 'Email already exists' });
      return;
    }

    const rawPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const newUser = await prisma.mst_users.create({
      data: {
        nama_user,
        email,
        password: hashedPassword,
        id_role: id_role || null,
        // Optionally create positions mapping if provided
        trn_user_position: position_ids && Array.isArray(position_ids) ? {
          create: position_ids.map((posId: number) => ({ id_position: posId }))
        } : undefined
      }
    });

    // In a real app, you would send an email to the user with their rawPassword
    res.status(201).json({
      message: 'User created successfully',
      data: {
        id_user: newUser.id_user,
        nama_user: newUser.nama_user,
        email: newUser.email,
        temporary_password: rawPassword // Returning it here for Admin to copy, since no email service is integrated
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// GET /users/summary
export const getUserSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const [totalActive, totalInactive, total] = await Promise.all([
      prisma.mst_users.count({ where: { is_active: true } }),
      prisma.mst_users.count({ where: { is_active: false } }),
      prisma.mst_users.count()
    ]);

    res.status(200).json({
      data: {
        total_users: total,
        active_users: totalActive,
        inactive_users: totalInactive
      }
    });
  } catch (error) {
    console.error('Error fetching user summary:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// GET /users/:id
export const getUserDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const user = await prisma.mst_users.findUnique({
      where: { id_user: id },
      select: {
        id_user: true,
        nama_user: true,
        email: true,
        is_active: true,
        created_at: true,
        mst_role: { select: { name_role: true } },
        trn_user_position: {
          include: { mst_position: true }
        }
      }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({ data: user });
  } catch (error) {
    console.error('Error fetching user detail:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// PUT /users/:id
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { nama_user, email, id_role, is_active } = req.body;

    const user = await prisma.mst_users.findUnique({ where: { id_user: id } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (email && email !== user.email) {
      const emailExists = await prisma.mst_users.findFirst({ where: { email } });
      if (emailExists) {
        res.status(400).json({ message: 'Email already exists' });
        return;
      }
    }

    const updatedUser = await prisma.mst_users.update({
      where: { id_user: id },
      data: {
        nama_user: nama_user || user.nama_user,
        email: email || user.email,
        id_role: id_role !== undefined ? id_role : user.id_role,
        is_active: is_active !== undefined ? is_active : user.is_active,
      },
      select: {
        id_user: true,
        nama_user: true,
        email: true,
        is_active: true
      }
    });

    res.status(200).json({ message: 'User updated successfully', data: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// DELETE /users/:id
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    // Soft delete: set is_active to false
    await prisma.mst_users.update({
      where: { id_user: id },
      data: { is_active: false }
    });

    res.status(200).json({ message: 'User deleted (deactivated) successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// GET /users/:id/attempts
export const getUserAttempts = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const attempts = await prisma.trn_test_attempt.findMany({
      where: { id_user: id },
      include: {
        trn_test_session: {
          select: { session_name: true, start_time: true, passing_score: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    res.status(200).json({ data: attempts });
  } catch (error) {
    console.error('Error fetching user attempts:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// PUT /users/:id/reset-password
export const resetUserPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const user = await prisma.mst_users.findUnique({ where: { id_user: id } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const rawPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    await prisma.mst_users.update({
      where: { id_user: id },
      data: { password: hashedPassword }
    });

    res.status(200).json({
      message: 'Password reset successfully',
      data: {
        id_user: user.id_user,
        nama_user: user.nama_user,
        email: user.email,
        temporary_password: rawPassword
      }
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// POST /users/import
export const importUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Excel file is required' });
      return;
    }

    // Read the file from buffer
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert sheet to JSON
    // Expecting columns: nama_user, email, id_role (optional)
    const rows = xlsx.utils.sheet_to_json(sheet) as any[];

    if (rows.length === 0) {
      res.status(400).json({ message: 'Excel file is empty' });
      return;
    }

    const importedUsers = [];
    const errors = [];

    // Process each row
    for (const [index, row] of rows.entries()) {
      const { nama_user, email, id_role } = row;

      if (!nama_user || !email) {
        errors.push({ row: index + 2, message: 'nama_user and email are required' });
        continue;
      }

      // Check if email exists
      const existingUser = await prisma.mst_users.findFirst({ where: { email } });
      if (existingUser) {
        errors.push({ row: index + 2, message: `Email ${email} already exists` });
        continue;
      }

      const rawPassword = generateRandomPassword();
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      try {
        const newUser = await prisma.mst_users.create({
          data: {
            nama_user,
            email,
            password: hashedPassword,
            id_role: id_role ? parseInt(id_role, 10) : null
          }
        });

        importedUsers.push({
          id_user: newUser.id_user,
          nama_user: newUser.nama_user,
          email: newUser.email,
          temporary_password: rawPassword
        });
      } catch (err: any) {
        errors.push({ row: index + 2, message: `Failed to create user: ${err.message}` });
      }
    }

    res.status(200).json({
      message: 'Import process completed',
      data: {
        total_processed: rows.length,
        total_success: importedUsers.length,
        total_failed: errors.length,
        success_data: importedUsers,
        errors
      }
    });
  } catch (error) {
    console.error('Error importing users:', error);
    res.status(500).json({ 
      message: 'Internal server error during import', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};
