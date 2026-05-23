import { Request, Response } from 'express';

export const uploadImage = (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    // Construct the URL path (assuming server runs on domain/port)
    // The static folder will be served at /uploads
    const imgPath = `/uploads/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        img_path: imgPath
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to upload image' });
  }
};
