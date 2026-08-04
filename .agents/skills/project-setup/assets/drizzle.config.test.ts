import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Forces the test DB URL to win over `.env`.
config({ path: '.env.test', override: true });

export default defineConfig({
  schema: './src/modules/drizzle/drizzle.schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});