import {
  AnyPgColumn,
  bigint,
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const primaryKeyUuid = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () =>
  timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date());
const publishedAt = () => timestamp('published_at', { withTimezone: true });

/** Practical Sharia status for crypto assets. */
export const shariaStatusEnum = pgEnum('sharia_status', [
  'halal',
  'haram',
  'syubhat',
]);
/** Publication lifecycle status for CMS content. */
export const contentStatusEnum = pgEnum('content_status', [
  'draft',
  'published',
  'archived',
]);
/** Storage provider for managed assets. */
export const assetProviderEnum = pgEnum('asset_provider', ['vercel_blob']);

/** Post section categories. */
export const postSectionEnum = pgEnum('post_section', [
  'news',
  'education',
  'research',
  'activity',
]);
/** Post content types. */
export const postTypeEnum = pgEnum('post_type', [
  'article',
  'webinar',
  'video',
  'headline',
]);
/** Administrative status for user accounts. */
export const userStatusEnum = pgEnum('user_status', [
  'active',
  'inactive',
  'suspended',
  'banned',
]);
/** Defined system roles for RBAC. */
export const userRoleEnum = pgEnum('user_role', [
  'super_admin',
  'admin',
  'posts_manager',
  'cryptoassets_manager',
  'member',
]);

/** Content section a tag can be surfaced in. */
export const tagSectionEnum = pgEnum('tag_section', ['news', 'education']);

/** Centralized user identity and account table. */
export const users = pgTable('users', {
  id: primaryKeyUuid(),
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  /** Optional reference to the user's profile image. */
  avatarId: uuid('avatar_id').references((): AnyPgColumn => assets.id),
  /** System role used for permission checks. */
  role: userRoleEnum('role').notNull().default('member'),
  /** Administrative account lifecycle status. */
  status: userStatusEnum('status').notNull().default('active'),
  /** Timestamp of the most recent successful login. */
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  updatedBy: uuid('updated_by').references((): AnyPgColumn => users.id),
});

/** Audit log for user and system activity. */
export const activityLogs = pgTable('activity_logs', {
  id: primaryKeyUuid(),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 50 }).notNull(),
  subjectType: varchar('subject_type', { length: 50 }).notNull(),
  subjectId: uuid('subject_id'),
  description: text('description'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: createdAt(),
});

/** Crypto asset screening and editorial content. */
export const cryptoassets = pgTable('cryptoassets', {
  id: primaryKeyUuid(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  ticker: varchar('ticker', { length: 20 }).notNull().unique(),
  /** Practical Sharia assessment. */
  shariaStatus: shariaStatusEnum('sharia_status').notNull(),
  status: contentStatusEnum('status').notNull().default('draft'),
  excerpt: text('excerpt').notNull(),
  tradingviewSymbol: varchar('tradingview_symbol', { length: 64 }),
  website: text('website').notNull(),
  /** Reference to the cryptoasset logo asset. */
  logoId: uuid('logo_id')
    .references(() => assets.id)
    .notNull(),
  /** Detailed Sharia analysis or project description. */
  content: text('content').notNull(),
  publishedAt: publishedAt(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
});

/** Blog posts, articles, and other editorial content. */
export const posts = pgTable('posts', {
  id: primaryKeyUuid(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  excerpt: text('excerpt').notNull(),
  content: text('content').notNull(),
  /** Reference to the post cover image asset. */
  coverImageId: uuid('cover_image_id')
    .references(() => assets.id)
    .notNull(),
  section: postSectionEnum('section').notNull(),
  type: postTypeEnum('type').notNull(),
  status: contentStatusEnum('status').notNull().default('draft'),
  isFeatured: boolean('is_featured').notNull().default(false),
  eventDate: timestamp('event_date', { withTimezone: true }),
  externalLink: text('external_link'),
  publishedAt: publishedAt(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
});

/** Tags shared by posts and crypto assets. */
export const tags = pgTable('tags', {
  id: primaryKeyUuid(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  description: text('description'),
  section: tagSectionEnum('section'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
});

/** Many-to-many relationship between cryptoassets and tags. */
export const cryptoassetTags = pgTable(
  'cryptoasset_tags',
  {
    cryptoassetId: uuid('cryptoasset_id')
      .notNull()
      .references(() => cryptoassets.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.cryptoassetId, table.tagId] })],
);

/** Many-to-many relationship between posts and tags. */
export const postTags = pgTable(
  'post_tags',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.postId, table.tagId] })],
);

/** Messages submitted through the contact form. */
export const messages = pgTable('messages', {
  id: primaryKeyUuid(),
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  message: text('message').notNull(),
  createdAt: createdAt(),
});

/** Metadata for files stored by an object-storage provider. */
export const assets = pgTable('assets', {
  id: primaryKeyUuid(),
  /** Provider pathname used to locate the stored object. */
  pathname: text('pathname').notNull().unique(),
  filename: varchar('filename', { length: 255 }).notNull(),
  size: bigint('size', { mode: 'number' }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }),
  width: integer('width'),
  height: integer('height'),
  /** Provider that owns the object. */
  provider: assetProviderEnum('provider').notNull(),
  createdAt: createdAt(),
  createdBy: uuid('created_by').references(() => users.id),
});

/** Metadata returned by the ImgBB upload flow. */
export const imgbbImages = pgTable('imgbb_images', {
  id: primaryKeyUuid(),
  imgbbId: varchar('imgbb_id', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  url: text('url').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  size: bigint('size', { mode: 'number' }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  deleteUrl: text('delete_url').notNull(),
  createdAt: createdAt(),
  createdBy: uuid('created_by').references(() => users.id),
});

/** Team members showcased in About Us / Pengurus. */
export const teamMembers = pgTable('team_members', {
  id: primaryKeyUuid(),
  slug: varchar('slug', { length: 100 }).unique(),
  name: varchar('name', { length: 150 }).notNull(),
  credentials: varchar('credentials', { length: 150 }),
  role: varchar('role', { length: 150 }).notNull(),
  imageId: uuid('image_id').references((): AnyPgColumn => assets.id),
  imageUrl: text('image_url'),
  description: text('description').notNull(),
  focus: varchar('focus', { length: 255 }).notNull(),
  contribution: text('contribution'),
  joined: varchar('joined', { length: 100 }),
  expertise: jsonb('expertise')
    .$type<Array<{ title: string; description: string }>>()
    .notNull()
    .default([]),
  orderIndex: integer('order_index').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  createdBy: uuid('created_by').references((): AnyPgColumn => users.id),
  updatedBy: uuid('updated_by').references((): AnyPgColumn => users.id),
});
