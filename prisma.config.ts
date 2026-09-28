import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // Migrations : connexion directe (Neon : URL sans « -pooler »), l'application utilise DATABASE_URL (poolée).
  // DATABASE_URL_UNPOOLED : nom donné par l'intégration Neon de Vercel.
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || '',
  },
});
