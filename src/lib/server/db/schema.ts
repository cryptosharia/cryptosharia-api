import { pgTable, uuid, timestamp, text, integer, pgEnum } from 'drizzle-orm/pg-core';

/**
 * Base column definitions to be spread into other table schemas.
 *
 * NOTE ON TIMEZONES:
 * We use { withTimezone: true } to create `TIMESTAMPTZ` columns.
 * 1. Storage: Postgres internally converts all input to UTC and stores as UTC.
 * 2. Retrieval: Postgres converts the internal UTC value to the connection session timezone.
 *    NOTE: When serialized to the browser, Server sends this as a UTC ISO string,
 *    allowing the browser to handle the final local timezone conversion.
 */
const BASE_TABLE = {
	id: uuid('id').primaryKey().defaultRandom(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
};

// --- Enums ---

export const categoryEnum = pgEnum('category', ['activity', 'article']);
export const statusEnum = pgEnum('status', ['halal', 'haram', 'syubhat']);

// --- Tables ---

/**
 * Stores blog articles and activity logs.
 */
export const posts = pgTable('posts', {
	...BASE_TABLE,
	slug: text('slug').unique().notNull(),
	category: categoryEnum('category').notNull(),
	tags: text('tags').array().notNull().default([]),
	title: text('title').notNull(),
	description: text('description'),
	thumbnailUrl: text('thumbnail_url'),
	contentUrl: text('content_url')
});

/**
 * Stores cryptocurrency tokendata, including its Sharia compliance status.
 */
export const tokens = pgTable('tokens', {
	...BASE_TABLE,
	slug: text('slug').unique().notNull(),
	rank: integer('rank'),
	name: text('name').notNull(),
	ticker: text('ticker').notNull(),
	status: statusEnum('status').notNull(),
	color: text('color'),
	tags: text('tags').array().notNull().default([]),
	tvPair: text('tv_pair'),
	website: text('website'),
	logoUrl: text('logo_url'),
	overviewUrl: text('overview_url'),
	conclusionUrl: text('conclusion_url')
});
