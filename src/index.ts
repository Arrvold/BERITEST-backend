import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requireApiKey } from './middlewares/api-key.middleware';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply API Key security globally
app.use(requireApiKey);

app.get('/', (req: Request, res: Response) => {
  res.send('BeriTest API is running!');
});

// Import and use routes here
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';

app.use('/auth', authRoutes);
app.use('/users', userRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
