import { Router } from 'express';
import { uploadImage as uploadImageMiddleware } from '../middlewares/upload-image.middleware';
import { uploadImage } from '../controllers/upload.controller';

const router = Router();

router.post('/image', uploadImageMiddleware.single('image'), uploadImage);

export default router;
