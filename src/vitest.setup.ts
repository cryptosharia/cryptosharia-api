import { beforeEach } from 'vitest';
import { db } from './lib/db';
import * as tables from './lib/db/tables';
import { sql, is } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';

/**
 * Global setup for Vitest integration tests.
 * Runs before each test.
 */
beforeEach(async () => {
	// 1. Identify all table names from the schema
	const tableNames = (Object.values(tables) as unknown[])
		.filter((t): t is PgTable => is(t, PgTable))
		.map((t) => getTableConfig(t).name);

	if (tableNames.length === 0) return;

	// 2. Truncate all tables to ensure a clean slate for every test
	const query = sql.raw(
		`TRUNCATE TABLE ${tableNames.map((name) => `"${name}"`).join(', ')} CASCADE;`
	);

	try {
		await db.execute(query);
	} catch (err) {
		console.error('Failed to truncate tables during test setup:', err);
		throw err;
	}
});
