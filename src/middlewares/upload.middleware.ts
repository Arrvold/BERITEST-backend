import multer from 'multer';
import path from 'path';

// Use memory storage since we only need to read the excel file in memory
// and don't necessarily need to save it to disk.
const storage = multer.memoryStorage();

export const uploadExcel = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Check for excel file extensions or mimetypes
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv'
    ];

    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv' || allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel and CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

