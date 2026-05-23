import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requireApiKey } from './middlewares/api-key.middleware';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

import path from 'path';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Apply API Key security globally
app.use(requireApiKey);

app.get('/', (req: Request, res: Response) => {
  res.send('BeriTest API is running!');
});

// Import and use routes here
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import courseRoutes from './routes/course.routes';
import batchRoutes from './routes/batch.routes';
import testSessionRoutes from './routes/test-session.routes';
import positionRoutes from './routes/position.routes';
import questionRoutes from './routes/question.routes';
import questionGroupRoutes from './routes/question-group.routes';
import attemptRoutes from './routes/attempt.routes';
import uploadRoutes from './routes/upload.routes';

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/courses', courseRoutes);
app.use('/batches', batchRoutes);
app.use('/test-sessions', testSessionRoutes);
app.use('/positions', positionRoutes);
app.use('/questions', questionRoutes);
app.use('/question-groups', questionGroupRoutes);
app.use('/attempts', attemptRoutes);
app.use('/upload', uploadRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
