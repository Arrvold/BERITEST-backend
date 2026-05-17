import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nama_user, email, password, id_role } = req.body;

    if (!nama_user || !email || !password) {
      res.status(400).json({ message: 'Name, email, and password are required' });
      return;
    }

    const existingUser = await prisma.mst_users.findFirst({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: 'Email already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.mst_users.create({
      data: {
        nama_user,
        email,
        password: hashedPassword,
        id_role: id_role || null // Can assign admin role if provided
      }
    });

    res.status(201).json({
      message: 'User registered successfully',
      data: {
        id_user: newUser.id_user,
        nama_user: newUser.nama_user,
        email: newUser.email
      }
    });
  } catch (error: any) {
    console.error('Register error:', error);
    
    // Handle Prisma specific errors
    if (error.code === 'P2003') {
      res.status(400).json({ 
        message: 'Foreign key constraint failed. Make sure the id_role exists in mst_role table.' 
      });
      return;
    }

    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
       res.status(400).json({ message: 'Email and password are required' });
       return;
    }

    // Find user by email
    const user = await prisma.mst_users.findFirst({
      where: { email },
      include: {
        mst_role: true // Include role to know if they are admin or user
      }
    });

    if (!user) {
       res.status(401).json({ message: 'Invalid credentials' });
       return;
    }

    if (!user.is_active) {
       res.status(403).json({ message: 'User account is inactive' });
       return;
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password || '');
    if (!isPasswordValid) {
       res.status(401).json({ message: 'Invalid credentials' });
       return;
    }

    // Generate JWT token
    const secret = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here';
    const token = jwt.sign(
      { 
        id: user.id_user, 
        email: user.email, 
        role: user.mst_role?.name_role 
      },
      secret,
      { expiresIn: '12h' } // Token valid for 12 hours
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id_user,
        name: user.nama_user,
        email: user.email,
        role: user.mst_role?.name_role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // JWT is stateless, so "logout" typically means the client deletes the token.
    // If we use cookies, we would clear the cookie here.
    // For now, we just return a success message so the frontend knows to clear storage.
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};
