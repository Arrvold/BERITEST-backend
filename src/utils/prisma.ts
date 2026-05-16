import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  // In Prisma 7, the URL might need to be passed here or is still picked up from env?
  // Let's rely on default behavior or pass adapter later if needed.
});

export default prisma;
