import { Pool } from 'pg';

export async function resetTestDatabase() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rows } = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
    );
    if (rows.length === 0) return;
    const names = rows
      .map((r) => `"${r.table_name.replaceAll('"', '""')}"`)
      .join(', ');
    // Cascade clears dependent rows and restart identity keeps database fixtures deterministic.
    await pool.query(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
  } finally {
    await pool.end();
  }
}
