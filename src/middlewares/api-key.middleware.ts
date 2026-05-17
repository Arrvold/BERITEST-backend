import { Request, Response, NextFunction } from 'express';

export const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_KEY || 'your_secure_api_key_here';

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(403).json({ message: 'Forbidden: Invalid API Key' });
  }

  next();
};
