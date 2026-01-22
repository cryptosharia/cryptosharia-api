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
	unique,
	primaryKey
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
export const adminRoleEnum = pgEnum('admin_role', ['super_admin', 'editor', 'viewer']);

// --- Admin & RBAC Tables ---

/**
 * Master permissions per module.
 */
export const permissions = pgTable('permissions', {
	...PK_INT,
	name: varchar('name', { length: 100 }).notNull(),
	slug: varchar('slug', { length: 100 }).notNull().unique(), // e.g. 'tokens.create'
	module: varchar('module', { length: 50 }).notNull(), // e.g. 'tokens'
	...BASE_TIMESTAMPS
});

/**
 * Master roles for admins.
 */
export const roles = pgTable('roles', {
	...PK_INT,
	name: varchar('name', { length: 50 }).notNull(),
	slug: varchar('slug', { length: 50 }).notNull().unique(),
	...BASE_TIMESTAMPS
});

/**
 * Junction table for Role-Permissions.
 */
export const rolePermissions = pgTable('role_permissions', {
	roleId: integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
	permissionId: integer('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (t) => ({
	pk: primaryKey({ columns: [t.roleId, t.permissionId] })
}));

/**
 * Table for Internal Staff / Admins.
 */
export const admins = pgTable('admins', {
	...PK_UUID,
	name: varchar('name', { length: 120 }).notNull(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	password: text('password').notNull(),
	avatarUrl: text('avatar_url'),
	roleId: integer('role_id').references(() => roles.id),
	isActive: boolean('is_active').notNull().default(true),
	twoFactorSecret: text('two_factor_secret'),
	lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
	...BASE_TIMESTAMPS
});

/**
 * Table for Public Users (Future use).
 */
export const users = pgTable('users', {
	...PK_UUID,
	username: varchar('username', { length: 50 }).unique(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	password: text('password').notNull(),
	isVerified: boolean('is_verified').notNull().default(false),
	...BASE_TIMESTAMPS
});

/**
 * Detailed audit logs for admin actions.
 */
export const activityLogs = pgTable('activity_logs', {
	...PK_UUID,
	adminId: uuid('admin_id').references(() => admins.id),
	action: varchar('action', { length: 50 }).notNull(), // e.g., 'UPDATE'
	subjectType: varchar('subject_type', { length: 50 }).notNull(), // e.g., 'tokens'
	subjectId: uuid('subject_id'),
	description: jsonb('description'),
	ipAddress: varchar('ip_address', { length: 45 }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// --- Blameable Helper ---
// Reusable fields to track who created/edited a record
const BLAMEABLE = {
	createdBy: uuid('created_by').references(() => admins.id),
	lastEditedBy: uuid('last_edited_by').references(() => admins.id)
};

// --- Updated Existing Tables ---

export const settings = pgTable('settings', {
	...PK_UUID,
	key: varchar('key', { length: 120 }).notNull().unique(),
	type: settingTypeEnum('type').notNull(),
	value: jsonb('value').notNull(),
	...BLAMEABLE,
	...BASE_TIMESTAMPS
});

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
	...BLAMEABLE,
	...BASE_TIMESTAMPS
});

export const principles = pgTable('principles', {
	...PK_UUID,
	title: varchar('title', { length: 100 }).notNull(),
	description: text('description').notNull(),
	colorHex: varchar('color_hex', { length: 7 }).notNull(),
	iconId: integer('icon_id').notNull().references(() => icons.id),
	displayOrder: integer('display_order'),
	...BLAMEABLE,
	...BASE_TIMESTAMPS
});

// ... (Penerapan BLAMEABLE bisa dilanjutkan ke tabel lain seperti contributors, links, dll)

export const tags = pgTable('tags', {
	...PK_INT,
	name: varchar('name', { length: 50 }).notNull().unique(),
	...BASE_TIMESTAMPS
});

export const tokenTags = pgTable(
	'token_tags',
	{
		...PK_INT,
		tokenId: uuid('token_id').notNull().references(() => tokens.id, { onDelete: 'cascade' }),
		tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
		displayOrder: integer('display_order'),
		...BASE_TIMESTAMPS
	},
	(t) => [unique('token_tags_token_id_tag_id_unique').on(t.tokenId, t.tagId)]
);

export const icons = pgTable('icons', {
	...PK_INT,
	type: iconTypeEnum('type').notNull(),
	icon: text('icon').notNull(),
	...BASE_TIMESTAMPS
});

export const contributors = pgTable('contributors', {
	...PK_UUID,
	name: varchar('name', { length: 120 }).notNull(),
	role: varchar('role', { length: 120 }).notNull(),
	photoUrl: text('photo_url'),
	bio: text('bio'),
	isActive: boolean('is_active').notNull().default(true),
	displayOrder: integer('display_order'),
	...BLAMEABLE,
	...BASE_TIMESTAMPS
});

export const contributorLinks = pgTable('contributor_links', {
	...PK_INT,
	contributorId: uuid('contributor_id').notNull().references(() => contributors.id, { onDelete: 'cascade' }),
	iconId: integer('icon_id').notNull().references(() => icons.id),
	href: text('href').notNull(),
	label: varchar('label', { length: 50 }),
	displayOrder: integer('display_order'),
	...BASE_TIMESTAMPS
});

export const links = pgTable('links', {
	...PK_UUID,
	label: varchar('label', { length: 100 }).notNull(),
	href: text('href').notNull(),
	iconId: integer('icon_id').notNull().references(() => icons.id),
	colorHex: varchar('color_hex', { length: 7 }),
	displayOrder: integer('display_order'),
	...BASE_TIMESTAMPS
});

export const socials = pgTable('socials', {
	...PK_UUID,
	label: varchar('label', { length: 100 }).notNull(),
	href: text('href').notNull(),
	iconId: integer('icon_id').notNull().references(() => icons.id),
	displayOrder: integer('display_order'),
	...BASE_TIMESTAMPS
});

export const messages = pgTable('messages', {
	...PK_UUID,
	name: varchar('name', { length: 120 }).notNull(),
	email: varchar('email', { length: 255 }).notNull(),
	message: text('message').notNull(),
	...BASE_TIMESTAMPS
});
