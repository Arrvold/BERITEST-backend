import { Router } from 'express';
import {
  getCourses,
  createCourse,
  getCourseDetail,
  updateCourse,
  deleteCourse,
  getCourseBatches
} from '../controllers/course.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createCourseSchema,
  updateCourseSchema,
  courseIdParamSchema,
  listCoursesSchema
} from '../validations/course.validation';

const router = Router();

// All course routes should be protected by the authentication middleware
router.use(authenticateToken);

// List Course
router.get('/', validate(listCoursesSchema), getCourses);

// Create Course
router.post('/', validate(createCourseSchema), createCourse);

// Course Detail
router.get('/:id', validate(courseIdParamSchema), getCourseDetail);

// Update Course
router.put('/:id', validate(updateCourseSchema), updateCourse);

// Delete Course (Soft Delete)
router.delete('/:id', validate(courseIdParamSchema), deleteCourse);

// Course Batch List
router.get('/:id/batches', validate(courseIdParamSchema), getCourseBatches);

export default router;
