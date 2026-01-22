import {
	pgTable,
	uuid,
	timestamp,
	text,
	integer,
	pgEnum,
	varchar,
	boolean,
	jsonb,
	unique
} from 'drizzle-orm/pg-core';

// --- Helpers ---

const PK_UUID = {
	id: uuid('id').primaryKey().defaultRandom()
};

const PK_INT = {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity()
};

const BASE_TIMESTAMPS = {
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
};

// --- Enums ---

export const shariaStatusEnum = pgEnum('sharia_status', ['halal', 'haram', 'syubhat']);
export const iconTypeEnum = pgEnum('icon_type', ['lucide', 'simple_icons', 'svg']);
export const settingTypeEnum = pgEnum('setting_type', [
	'number',
	'boolean',
	'string',
	'text',
	'markdown',
	'array'
]);

// --- Tables ---

/**
 * Stores various application settings and configurations.
 */
export const settings = pgTable('settings', {
	...PK_UUID,
	key: varchar('key', { length: 120 }).notNull().unique(),
	type: settingTypeEnum('type').notNull(),
	value: jsonb('value').notNull(),

	...BASE_TIMESTAMPS
});

/**
 * Represents a cryptocurrency token with its Sharia compliance status.
 */
export const tokens = pgTable('tokens', {
	...PK_UUID,
	slug: varchar('slug', { length: 100 }).notNull().unique(),
	rank: integer('rank'),

	name: varchar('name', { length: 100 }).notNull(),
	ticker: varchar('ticker', { length: 20 }).notNull().unique(),

	shariaStatus: shariaStatusEnum('sharia_status').notNull(),

	brandColorHex: varchar('brand_color_hex', { length: 7 }),
	tradingviewSymbol: varchar('tradingview_symbol', { length: 64 }),

	website: text('website'),
	logoUrl: text('logo_url'),
	contentUrl: text('content_url').notNull(),

	...BASE_TIMESTAMPS
});

/**
 * Stores reusable tags for Tokens, Posts, etc.
 */
export const tags = pgTable('tags', {
	...PK_INT,
	name: varchar('name', { length: 50 }).notNull().unique(),

	...BASE_TIMESTAMPS
});

/**
 * Junction table for the Many-to-Many relationship between Tokens and Tags.
 * Includes `display_order` for controlling tag order per token.
 */
export const tokenTags = pgTable(
	'token_tags',
	{
		...PK_INT,
		tokenId: uuid('token_id')
			.notNull()
			.references(() => tokens.id, { onDelete: 'cascade' }),
		tagId: integer('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' }),
		displayOrder: integer('display_order'),

		...BASE_TIMESTAMPS
	},
	(t) => [unique('token_tags_token_id_tag_id_unique').on(t.tokenId, t.tagId)]
);

/**
 * A central repository for icons (Lucide, Simple Icons, or raw SVG).
 * Referenced by Principles, Contributor Links, etc.
 */
export const icons = pgTable('icons', {
	...PK_INT,
	type: iconTypeEnum('type').notNull(),
	icon: text('icon').notNull(),

	...BASE_TIMESTAMPS
});

/**
 * Stores the Principles of CryptoSharia.
 */
export const principles = pgTable('principles', {
	...PK_UUID,
	title: varchar('title', { length: 100 }).notNull(),
	description: text('description').notNull(),
	colorHex: varchar('color_hex', { length: 7 }).notNull(),
	iconId: integer('icon_id')
		.notNull()
		.references(() => icons.id), // No cascade (RESTRICT default)
	displayOrder: integer('display_order'),

	...BASE_TIMESTAMPS
});

/**
 * Stores the Contributors of CryptoSharia.
 */
export const contributors = pgTable('contributors', {
	...PK_UUID,
	name: varchar('name', { length: 120 }).notNull(),
	role: varchar('role', { length: 120 }).notNull(),
	photoUrl: text('photo_url'),
	bio: text('bio'),
	isActive: boolean('is_active').notNull().default(true),
	displayOrder: integer('display_order'),

	...BASE_TIMESTAMPS
});

/**
 * Stores the Social Links of Contributors.
 */
export const contributorLinks = pgTable('contributor_links', {
	...PK_INT,
	contributorId: uuid('contributor_id')
		.notNull()
		.references(() => contributors.id, { onDelete: 'cascade' }),
	iconId: integer('icon_id')
		.notNull()
		.references(() => icons.id), // No cascade
	href: text('href').notNull(),
	label: varchar('label', { length: 50 }),
	displayOrder: integer('display_order'),

	...BASE_TIMESTAMPS
});

/**
 * Stores links (e.g. for floating CTA, etc).
 */
export const links = pgTable('links', {
	...PK_UUID,
	label: varchar('label', { length: 100 }).notNull(),
	href: text('href').notNull(),
	iconId: integer('icon_id')
		.notNull()
		.references(() => icons.id),
	colorHex: varchar('color_hex', { length: 7 }),
	displayOrder: integer('display_order'),

	...BASE_TIMESTAMPS
});

/**
 * Stores CryptoSharia's social medias.
 */
export const socials = pgTable('socials', {
	...PK_UUID,
	label: varchar('label', { length: 100 }).notNull(),
	href: text('href').notNull(),
	iconId: integer('icon_id')
		.notNull()
		.references(() => icons.id),
	displayOrder: integer('display_order'),

	...BASE_TIMESTAMPS
});

/**
 * Stores messages sent via the contact form.
 */
export const messages = pgTable('messages', {
	...PK_UUID,
	name: varchar('name', { length: 120 }).notNull(),
	email: varchar('email', { length: 255 }).notNull(),
	message: text('message').notNull(),

	...BASE_TIMESTAMPS
});
