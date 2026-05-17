import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding roles...');

  const roles = [
    { id_role: 1, name_role: 'Admin' },
    { id_role: 2, name_role: 'User' },
  ];

  for (const role of roles) {
    await prisma.mst_role.upsert({
      where: { id_role: role.id_role },
      update: {},
      create: role,
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
