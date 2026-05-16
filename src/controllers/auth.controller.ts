import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

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
    res.status(500).json({ message: 'Internal server error' });
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
    res.status(500).json({ message: 'Internal server error' });
  }
};
