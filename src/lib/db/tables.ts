import {
	pgTable,
	uuid,
	timestamp,
	text,
	integer,
	pgEnum,
	varchar,
	boolean,
	bigint,
	primaryKey,
	type AnyPgColumn
} from 'drizzle-orm/pg-core';
// --- Helpers ---

/**
 * Standard Primary Key for UUID-based tables.
 */
const PK_UUID = {
	id: uuid('id').primaryKey().defaultRandom()
};

/**
 * Audit field for creation timestamp.
 */
const CREATED_AT = {
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
};

/**
 * Audit field for update timestamp.
 * Logically nullable to represent an 'unmodified' state.
 */
const UPDATED_AT = {
	updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date())
};

/**
 * Content field for publication timestamp.
 */
const PUBLISHED_AT = {
	publishedAt: timestamp('published_at', { withTimezone: true })
};

/**
 * Standard audit field for the creator.
 */
const CREATED_BY = {
	createdBy: uuid('created_by').references(() => admins.id)
};

/**
 * Standard audit field for the updater.
 */
const UPDATED_BY = {
	updatedBy: uuid('updated_by').references(() => admins.id)
};

/**
 * Specialized audit helpers specifically for tables that have circular dependencies (admins, roles).
 * Uses AnyPgColumn to break the TypeScript recursion loop while keeping SQL Foreign Keys.
 */
const CREATED_BY_CIR = {
	createdBy: uuid('created_by').references((): AnyPgColumn => admins.id)
};

const UPDATED_BY_CIR = {
	updatedBy: uuid('updated_by').references((): AnyPgColumn => admins.id)
};

// --- Enums ---

/**
 * Practical Sharia status for crypto assets.
 */
export const shariaStatusEnum = pgEnum('sharia_status', ['halal', 'haram', 'syubhat']);

/**
 * Publication lifecycle status for CMS content.
 */
export const contentStatusEnum = pgEnum('content_status', ['draft', 'published', 'archived']);

/**
 * Storage provider for assets.
 */
export const assetProviderEnum = pgEnum('asset_provider', ['local', 'picsum', 'vercel_blob']);

/**
 * Post section categories.
 */
export const postSectionEnum = pgEnum('post_section', [
	'news',
	'education',
	'research',
	'activity'
]);

/**
 * Post content types.
 */
export const postTypeEnum = pgEnum('post_type', ['article', 'webinar', 'video', 'headline']);

// --- Tables ---

/**
 * Stores permissions per module.
 */
export const permissions = pgTable('permissions', {
	...PK_UUID,
	/** Human-readable name of the permission */
	name: varchar('name', { length: 100 }).notNull(),
	/** Programmatic key for code-level permission checks (e.g. 'tokens.create') */
	key: varchar('key', { length: 100 }).notNull().unique(),
	/** Logical grouping for the permission (e.g. 'tokens') */
	module: varchar('module', { length: 50 }).notNull(),
	...CREATED_AT,
	...UPDATED_AT
});

/**
 * Stores roles for admins.
 */
export const roles = pgTable('roles', {
	...PK_UUID,
	/** Display name of the role (e.g. 'Super Admin') */
	name: varchar('name', { length: 50 }).notNull(),
	/** Unique URL-friendly identifier for the role */
	slug: varchar('slug', { length: 50 }).notNull().unique(),
	...CREATED_BY_CIR,
	...UPDATED_BY_CIR,
	...CREATED_AT,
	...UPDATED_AT
});

/**
 * Stores internal staff (admins).
 */
export const admins = pgTable('admins', {
	...PK_UUID,
	/** Full name of the administrator */
	name: varchar('name', { length: 120 }).notNull(),
	/** Unique email address for login and notifications */
	email: varchar('email', { length: 255 }).notNull().unique(),
	/** Argon2 or Bcrypted password hash */
	hashedPassword: text('hashed_password').notNull(),
	/** URL to the admin's profile image (optional) */
	avatarUrl: text('avatar_url'),
	/** Reference to the assigned role */
	roleId: uuid('role_id').references((): AnyPgColumn => roles.id),
	/** Boolean flag to enable/disable account access */
	isActive: boolean('is_active').notNull().default(true),
	/** TOTP or secondary authentication secret */
	twoFactorSecret: text('two_factor_secret'),
	/** Timestamp of the most recent successful login */
	lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
	...CREATED_BY_CIR,
	...UPDATED_BY_CIR,
	...CREATED_AT,
	...UPDATED_AT
});

/**
 * Stores role-permission many-to-many relationships.
 */
export const rolePermissions = pgTable(
	'role_permissions',
	{
		/** Reference to the role */
		roleId: uuid('role_id')
			.notNull()
			.references(() => roles.id, { onDelete: 'cascade' }),
		/** Reference to the permission */
		permissionId: uuid('permission_id')
			.notNull()
			.references(() => permissions.id, { onDelete: 'cascade' })
	},
	(t) => [primaryKey({ columns: [t.roleId, t.permissionId] })]
);

/**
 * Stores audit logs for admins' activities.
 */
export const activityLogs = pgTable('activity_logs', {
	...PK_UUID,
	/** ID of the admin who performed the action */
	adminId: uuid('admin_id').references(() => admins.id),
	/** Description of the action (e.g. 'create', 'update', 'delete') */
	action: varchar('action', { length: 50 }).notNull(),
	/** Type of entity the action was performed on (e.g. 'tokens', 'posts') */
	subjectType: varchar('subject_type', { length: 50 }).notNull(),
	/** ID of the specific entity associated with the log */
	subjectId: uuid('subject_id'),
	/** Detailed human-readable description of the event */
	description: text('description'),
	/** IP address of the administrator at the time of the action */
	ipAddress: varchar('ip_address', { length: 45 }),
	...CREATED_AT
});

/**
 * Stores tokens data.
 */
export const tokens = pgTable('tokens', {
	...PK_UUID,
	/** Unique URL-friendly identifier for the token */
	slug: varchar('slug', { length: 100 }).notNull().unique(),
	/** Global market capitalization rank (optional) */
	rank: integer('rank'),
	/** Full display name of the cryptocurrency (e.g. 'Bitcoin') */
	name: varchar('name', { length: 100 }).notNull(),
	/** Short symbol (e.g. 'BTC') */
	ticker: varchar('ticker', { length: 20 }).notNull().unique(),
	/** Sharia compliance rating */
	shariaStatus: shariaStatusEnum('sharia_status').notNull(),
	/** Current editorial status of the token metadata */
	status: contentStatusEnum('status').notNull().default('draft'),
	/** Primary brand color in HEX format */
	brandColorHex: varchar('brand_color_hex', { length: 7 }),
	/** TradingView symbol for technical charts (e.g. 'BINANCE:BTCUSDT') */
	tradingviewSymbol: varchar('tradingview_symbol', { length: 64 }),
	/** Official project website URL */
	website: text('website'),
	/** Reference to the token's logo asset */
	logoId: uuid('logo_id').references(() => assets.id),
	/** Detailed Sharia analysis or project description (Markdown) */
	content: text('content'),
	...PUBLISHED_AT,
	...CREATED_BY,
	...UPDATED_BY,
	...CREATED_AT,
	...UPDATED_AT
});

/**
 * Stores blog posts, articles, and other content types.
 */
export const posts = pgTable('posts', {
	...PK_UUID,
	/** Main title of the post or article */
	title: varchar('title', { length: 255 }).notNull(),
	/** Unique URL-friendly slug */
	slug: varchar('slug', { length: 255 }).notNull().unique(),
	/** Brief summary of the content for listings */
	excerpt: text('excerpt'),
	/** Main content of the post (HTML or Markdown) */
	content: text('content'),
	/** Reference to the main cover image asset */
	coverImageId: uuid('cover_image_id').references(() => assets.id),
	/** Logical section or category */
	section: postSectionEnum('section').notNull(),
	/** Document type */
	type: postTypeEnum('type').notNull(),
	/** Publication workflow status */
	status: contentStatusEnum('status').notNull().default('draft'),
	/** If true, this post will be highlighted in the UI */
	isFeatured: boolean('is_featured').notNull().default(false),
	/** Scheduled or historical date associated with the event */
	eventDate: timestamp('event_date', { withTimezone: true }),
	/** Link to external source or full article */
	externalLink: text('external_link'),
	...PUBLISHED_AT,
	...CREATED_BY,
	...UPDATED_BY,
	...CREATED_AT,
	...UPDATED_AT
});

/**
 * Stores tags for posts & tokens.
 */
export const tags = pgTable('tags', {
	...PK_UUID,
	/** Human-readable name of the tag (e.g. 'Halal Crypto') */
	name: varchar('name', { length: 50 }).notNull().unique(),
	/** URL-friendly identifier (e.g. 'halal-crypto') for SEO and routing */
	slug: varchar('slug', { length: 50 }).notNull().unique(),
	/** Detailed context about this tag */
	description: text('description'),
	...CREATED_BY,
	...UPDATED_BY,
	...CREATED_AT,
	...UPDATED_AT
});

/**
 * Junction table for the Many-to-Many relationship between Tokens and Tags.
 */
export const tokenTags = pgTable(
	'token_tags',
	{
		/** Reference to the associated Token */
		tokenId: uuid('token_id')
			.notNull()
			.references(() => tokens.id, { onDelete: 'cascade' }),
		/** Reference to the associated Tag */
		tagId: uuid('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' }),
		/**
		 * Logical display order. Nullable to represent 'unprioritized' items.
		 */
		displayOrder: integer('display_order')
	},
	(t) => [primaryKey({ columns: [t.tokenId, t.tagId] })]
);

/**
 * Junction table for the Many-to-Many relationship between Posts and Tags.
 */
export const postTags = pgTable(
	'post_tags',
	{
		/** Reference to the associated Post */
		postId: uuid('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		/** Reference to the associated Tag */
		tagId: uuid('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' }),
		/**
		 * Logical display order. Nullable to represent 'unprioritized' items.
		 */
		displayOrder: integer('display_order')
	},
	(t) => [primaryKey({ columns: [t.postId, t.tagId] })]
);

/**
 * Stores messages sent via the Contact Form.
 */
export const messages = pgTable('messages', {
	...PK_UUID,
	/** Name of the contact form sender */
	name: varchar('name', { length: 120 }).notNull(),
	/** Email address for response */
	email: varchar('email', { length: 255 }).notNull(),
	/** Full message content */
	message: text('message').notNull(),
	...CREATED_AT
});

/**
 * Stores metadata for all digital assets uploaded to files storage (Images, Markdowns, etc).
 */
export const assets = pgTable('assets', {
	...PK_UUID,
	/** Internal pathname in the storage provider */
	pathname: text('pathname').notNull().unique(),
	/** Original or generated filename */
	filename: varchar('filename', { length: 255 }).notNull(),
	/** File size in bytes (bigint for scale) */
	size: bigint('size', { mode: 'number' }).notNull(),
	/** MIME type (e.g. 'image/png') */
	mimeType: varchar('mime_type', { length: 100 }),
	/** Pixel width (for images) */
	width: integer('width'),
	/** Pixel height (for images) */
	height: integer('height'),
	/** Storage provider used for this asset */
	provider: assetProviderEnum('provider').notNull(),
	...CREATED_BY,
	...CREATED_AT
});

export const imgbbImages = pgTable('imgbb_images', {
	...PK_UUID,
	/** The unique ID for this asset on ImgBB */
	imgbbId: varchar('imgbb_id', { length: 255 }).notNull().unique(),
	/** The title of the asset */
	title: varchar('title', { length: 255 }).notNull(),
	/** Direct link to the original asset */
	url: text('url').notNull(),
	/** Image width in pixels */
	width: integer('width').notNull(),
	/** Image height in pixels */
	height: integer('height').notNull(),
	/** File size in bytes (bigint for scale) */
	size: bigint('size', { mode: 'number' }).notNull(),
	/** File name */
	fileName: varchar('file_name', { length: 255 }).notNull(),
	/** MIME type */
	mimeType: varchar('mime_type', { length: 100 }).notNull(),
	/** URL to delete this asset */
	deleteUrl: text('delete_url').notNull(),
	...CREATED_BY,
	...CREATED_AT
});
