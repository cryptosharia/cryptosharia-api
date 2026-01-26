import {
	pgTable,
	uuid,
	timestamp,
	text,
	integer,
	pgEnum,
	varchar,
	boolean,
	unique
} from 'drizzle-orm/pg-core';

// --- Helpers ---

const PK_UUID = {
	id: uuid('id').primaryKey().defaultRandom()
};

const PK_INT = {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity()
};

const CREATED_AT = {
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
};

const UPDATED_AT = {
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
};

const CREATED_BY = {
	createdBy: uuid('created_by').references(() => admins.id)
};

const UPDATED_BY = {
	updatedBy: uuid('updated_by').references(() => admins.id)
};

// --- Enums ---

export const shariaStatusEnum = pgEnum('sharia_status', ['halal', 'haram', 'syubhat']);

// --- Admin & RBAC Tables ---

/**
 * Stores roles for admins.
 */
export const roles = pgTable('roles', {
	...PK_UUID,
	name: varchar('name', { length: 50 }).notNull(),
	slug: varchar('slug', { length: 50 }).notNull().unique(),
	...CREATED_AT,
	...UPDATED_AT
});

/**
 * Stores internal staff (admins).
 */
export const admins = pgTable('admins', {
	...PK_UUID,
	name: varchar('name', { length: 120 }).notNull(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	hashedPassword: text('hashed_password').notNull(),
	avatarUrl: text('avatar_url'),
	roleId: uuid('role_id').references(() => roles.id),
	isActive: boolean('is_active').notNull().default(true),
	twoFactorSecret: text('two_factor_secret'),
	lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
	...CREATED_AT,
	...UPDATED_AT
});

/**
 * Stores permissions per module.
 */
export const permissions = pgTable('permissions', {
	...PK_UUID,
	name: varchar('name', { length: 100 }).notNull(),
	slug: varchar('slug', { length: 100 }).notNull().unique(), // e.g. 'tokens.create'
	module: varchar('module', { length: 50 }).notNull(), // e.g. 'tokens'
	...CREATED_AT,
	...UPDATED_AT
});

/**
 * Stores role-permission many-to-many relationships.
 */
export const rolePermissions = pgTable(
	'role_permissions',
	{
		...PK_INT,
		roleId: uuid('role_id')
			.notNull()
			.references(() => roles.id, { onDelete: 'cascade' }),
		permissionId: uuid('permission_id')
			.notNull()
			.references(() => permissions.id, { onDelete: 'cascade' })
	},
	(t) => [unique('role_permissions_role_id_permission_id_unique').on(t.roleId, t.permissionId)]
);

/**
 * Stores audit logs for admins' activities.
 */
export const activityLogs = pgTable('activity_logs', {
	...PK_INT,
	adminId: uuid('admin_id').references(() => admins.id),
	action: varchar('action', { length: 50 }).notNull(), // e.g., 'UPDATE'
	subjectType: varchar('subject_type', { length: 50 }).notNull(), // e.g., 'tokens'
	subjectId: uuid('subject_id'),
	description: text('description'),
	ipAddress: varchar('ip_address', { length: 45 }),
	...CREATED_AT
});

// --- Content Tables (With Audit Fields) ---

/**
 * Stores tokens data.
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
	...CREATED_BY,
	...UPDATED_BY,
	...CREATED_AT,
	...UPDATED_AT
});

/**
 * Stores tags for posts & tokens.
 */
export const tags = pgTable('tags', {
	...PK_INT,
	name: varchar('name', { length: 50 }).notNull().unique(),
	...CREATED_BY,
	...UPDATED_BY,
	...CREATED_AT,
	...UPDATED_AT
});

/**
 * Stores token tags many-to-many relationships.
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
		...CREATED_AT,
		...UPDATED_AT
	},
	(t) => [unique('token_tags_token_id_tag_id_unique').on(t.tokenId, t.tagId)]
);

// --- User-Facing Tables (No Audit Fields) ---

/**
 * Stores messages from users.
 */
export const messages = pgTable('messages', {
	...PK_INT,
	name: varchar('name', { length: 120 }).notNull(),
	email: varchar('email', { length: 255 }).notNull(),
	message: text('message').notNull(),
	...CREATED_AT
});
