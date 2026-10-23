import {
  AnyPgColumn,
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
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
  /** Argon2id password hash; null for accounts that still use OTP only. */
  passwordHash: text('password_hash'),
  /** Time the password was most recently set or reset. */
  passwordSetAt: timestamp('password_set_at', { withTimezone: true }),
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

/** Runtime visibility preferences for public website Academy promotion. */
export const websiteSettings = pgTable('website_settings', {
  key: varchar('key', { length: 50 }).primaryKey(),
  academyPromotionEnabled: boolean('academy_promotion_enabled')
    .notNull()
    .default(true),
  academyNavbarEnabled: boolean('academy_navbar_enabled')
    .notNull()
    .default(true),
  academyHomepageSectionEnabled: boolean('academy_homepage_section_enabled')
    .notNull()
    .default(true),
  version: integer('version').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedBy: uuid('updated_by').references((): AnyPgColumn => users.id),
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

/** Subjects supported in Academy LMS. */
export const academySubjectEnum = pgEnum('academy_subject', [
  'fundamental',
  'technical',
  'muamalah',
  'web3',
]);

/** Hierarchy kind for curriculum items. */
export const academyContentKindEnum = pgEnum('academy_content_kind', [
  'subject',
  'level',
  'chapter',
  'lesson',
]);

/** Publication lifecycle for Academy content preserving editorial workflow. */
export const academyContentStatusEnum = pgEnum('academy_content_status', [
  'draft',
  'review',
  'approved',
  'published',
  'archived',
]);

/** Grant status for participant entitlements. */
export const academyGrantStateEnum = pgEnum('academy_grant_state', [
  'active',
  'revoked',
]);

/** Access scope / subscription packaging for Academy modules. */
export const academyScopes = pgTable('academy_scopes', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  createdBy: uuid('created_by').references((): AnyPgColumn => users.id),
  updatedBy: uuid('updated_by').references((): AnyPgColumn => users.id),
});

/** Hierarchical curriculum content: subject -> level -> chapter -> lesson. */
export const academyContent = pgTable(
  'academy_content',
  {
    id: varchar('id', { length: 100 }).primaryKey(),
    kind: academyContentKindEnum('kind').notNull(),
    parentId: varchar('parent_id', { length: 100 }).notNull(),
    subjectId: academySubjectEnum('subject_id').notNull(),
    level: integer('level').notNull().default(1),
    chapterNumber: integer('chapter_number').notNull().default(1),
    order: integer('order').notNull().default(0),
    scopeId: varchar('scope_id', { length: 50 }).references(
      (): AnyPgColumn => academyScopes.id,
    ),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull().default(''),
    thumbnail: text('thumbnail').notNull().default('/favicon.png'),
    durationSeconds: integer('duration_seconds').notNull().default(0),
    instructor: varchar('instructor', { length: 150 }).notNull().default(''),
    status: academyContentStatusEnum('status').notNull().default('draft'),
    version: integer('version').notNull().default(1),
    // Editorial and Sharia compliance review semantics
    syariahRequired: boolean('syariah_required').notNull().default(false),
    reviewedBy: uuid('reviewed_by').references((): AnyPgColumn => users.id),
    syariahReviewedBy: uuid('syariah_reviewed_by').references(
      (): AnyPgColumn => users.id,
    ),
    rightsConfirmed: boolean('rights_confirmed').notNull().default(false),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    publishedAt: publishedAt(),
    publishedBy: uuid('published_by').references((): AnyPgColumn => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    createdBy: uuid('created_by').references((): AnyPgColumn => users.id),
    updatedBy: uuid('updated_by').references((): AnyPgColumn => users.id),
  },
  (table) => [
    uniqueIndex('idx_academy_content_parent_order').on(
      table.parentId,
      table.order,
    ),
    index('idx_academy_content_catalog').on(
      table.status,
      table.kind,
      table.scopeId,
    ),
    index('idx_academy_content_hierarchy').on(
      table.subjectId,
      table.level,
      table.chapterNumber,
    ),
  ],
);

/** Isolated private YouTube and reference materials for published lessons. */
export const academyLessonMedia = pgTable('academy_lesson_media', {
  lessonId: varchar('lesson_id', { length: 100 })
    .primaryKey()
    .references((): AnyPgColumn => academyContent.id, { onDelete: 'cascade' }),
  videoId: varchar('video_id', { length: 32 }).notNull(),
  version: integer('version').notNull().default(1),
  readingRefs: jsonb('reading_refs').$type<string[]>().notNull().default([]),
  slideRefs: jsonb('slide_refs').$type<string[]>().notNull().default([]),
  subtitleRefs: jsonb('subtitle_refs').$type<string[]>().notNull().default([]),
  attachmentRefs: jsonb('attachment_refs')
    .$type<string[]>()
    .notNull()
    .default([]),
  internalNote: text('internal_note'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  createdBy: uuid('created_by').references((): AnyPgColumn => users.id),
  updatedBy: uuid('updated_by').references((): AnyPgColumn => users.id),
});

/** Participant entitlements and access grants. */
export const academyGrants = pgTable(
  'academy_grants',
  {
    id: primaryKeyUuid(),
    userId: uuid('user_id')
      .notNull()
      .references((): AnyPgColumn => users.id, { onDelete: 'cascade' }),
    scopeId: varchar('scope_id', { length: 50 })
      .notNull()
      .references((): AnyPgColumn => academyScopes.id),
    state: academyGrantStateEnum('state').notNull().default('active'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    source: varchar('source', { length: 50 }).notNull().default('manual'),
    auditId: varchar('audit_id', { length: 100 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    createdBy: uuid('created_by').references((): AnyPgColumn => users.id),
    updatedBy: uuid('updated_by').references((): AnyPgColumn => users.id),
  },
  (table) => [
    index('idx_academy_grants_user_scope_state').on(
      table.userId,
      table.scopeId,
      table.state,
    ),
    index('idx_academy_grants_validity').on(
      table.userId,
      table.state,
      table.startsAt,
      table.expiresAt,
    ),
  ],
);

/** Playback resume positions self-reported during video study. */
export const academyProgress = pgTable(
  'academy_progress',
  {
    userId: uuid('user_id')
      .notNull()
      .references((): AnyPgColumn => users.id, { onDelete: 'cascade' }),
    lessonId: varchar('lesson_id', { length: 100 })
      .notNull()
      .references((): AnyPgColumn => academyContent.id, {
        onDelete: 'cascade',
      }),
    version: integer('version').notNull().default(1),
    positionSeconds: integer('position_seconds').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.lessonId] }),
    index('idx_academy_progress_user_updated').on(
      table.userId,
      table.updatedAt,
    ),
  ],
);

/** Explicit lesson completion records tied to authoritative published versions. */
export const academyCompletions = pgTable(
  'academy_completions',
  {
    userId: uuid('user_id')
      .notNull()
      .references((): AnyPgColumn => users.id, { onDelete: 'cascade' }),
    lessonId: varchar('lesson_id', { length: 100 })
      .notNull()
      .references((): AnyPgColumn => academyContent.id, {
        onDelete: 'cascade',
      }),
    version: integer('version').notNull().default(1),
    completedAt: timestamp('completed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.lessonId, table.version] }),
    index('idx_academy_completions_user').on(table.userId, table.lessonId),
  ],
);
