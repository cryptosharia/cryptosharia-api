import { createSelectSchema } from 'drizzle-zod';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { z } from 'zod';
import * as schema from './drizzle.schema';
import {
  activityLogs,
  assets,
  authTokens,
  imgbbImages,
  messages,
  postTags,
  posts,
  refreshTokens,
  tags,
  tokenTags,
  tokens,
  users,
} from './drizzle.schema';

export type DbExecutor =
  | NodePgDatabase<typeof schema>
  | Parameters<Parameters<NodePgDatabase<typeof schema>['transaction']>[0]>[0];

export const User = createSelectSchema(users, {
  name: (f) =>
    f
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(120)
      .meta({ description: 'User display name', example: 'John Doe' }),
  email: z.email('Invalid email address').max(255).meta({
    description: 'Email address used for signin',
    example: 'john@example.com',
  }),
  hashedPassword: (f) =>
    f.meta({ description: 'Argon2id password hash stored for the account' }),
  role: (f) =>
    f.meta({
      description: 'Role assigned to the user',
      example: 'member',
    }),
  status: (f) =>
    f.meta({ description: 'Administrative account status', example: 'active' }),
});
export type User = z.infer<typeof User>;

export const ActivityLog = createSelectSchema(activityLogs, {
  action: z
    .enum([
      'asset.upload',
      'auth.password-reset.complete',
      'auth.password-reset.request',
      'auth.refresh',
      'auth.signin',
      'auth.signout',
      'auth.signup',
      'auth.verify',
      'imgbb.upload',
      'post.create',
      'post.delete',
      'post.update',
      'tag.create',
      'tag.delete',
      'tag.update',
      'token.create',
      'token.delete',
      'token.update',
      'user.role.update',
      'user.status.update',
      'user.update',
    ])
    .meta({
      description: 'Action performed by the actor',
      example: 'auth.signin',
    }),
  subjectType: z
    .enum(['asset', 'auth', 'imgbb_image', 'posts', 'tags', 'tokens', 'user'])
    .meta({ description: 'Type of affected subject', example: 'auth' }),
  ipAddress: (f) =>
    f
      .max(45)
      .meta({ description: 'Client IP address associated with the event' }),
});
export type ActivityLog = z.infer<typeof ActivityLog>;

export const RefreshToken = createSelectSchema(refreshTokens, {
  token: (f) =>
    f.min(1).max(64).meta({ description: 'Opaque refresh token value' }),
  expiresAt: (f) =>
    f.meta({ description: 'Refresh token expiration timestamp' }),
  revokedAt: (f) =>
    f.meta({ description: 'Revocation timestamp, or null while active' }),
});
export type RefreshToken = z.infer<typeof RefreshToken>;

export const AuthToken = createSelectSchema(authTokens, {
  tokenHash: (f) =>
    f.min(1).max(255).meta({ description: 'Hashed opaque auth token' }),
  type: (f) => f.meta({ description: 'Purpose of the opaque auth token' }),
  expiresAt: (f) => f.meta({ description: 'Auth token expiration timestamp' }),
  revokedAt: (f) =>
    f.meta({ description: 'Revocation timestamp, or null while active' }),
});
export type AuthToken = z.infer<typeof AuthToken>;

export const Asset = createSelectSchema(assets, {
  pathname: (f) =>
    f.min(1).meta({ description: 'Provider pathname of the stored object' }),
  filename: (f) =>
    f.min(1).max(255).meta({
      description: 'Original or generated filename',
      example: 'cover.png',
    }),
  size: (f) =>
    f
      .nonnegative()
      .meta({ description: 'Object size in bytes', example: 1024 }),
  mimeType: (f) =>
    f.max(100).meta({
      description: 'MIME type of the stored object',
      example: 'image/png',
    }),
  width: (f) => f.nonnegative().meta({ description: 'Image width in pixels' }),
  height: (f) =>
    f.nonnegative().meta({ description: 'Image height in pixels' }),
  provider: (f) =>
    f.meta({
      description: 'Storage provider that owns the object',
      example: 'vercel_blob',
    }),
});
export type Asset = z.infer<typeof Asset>;

export const ImgbbImage = createSelectSchema(imgbbImages, {
  imgbbId: (f) =>
    f.min(1).max(255).meta({ description: 'Unique ImgBB asset identifier' }),
  title: (f) =>
    f.min(1).max(255).meta({
      description: 'ImgBB asset title',
      example: 'CryptoSharia cover',
    }),
  url: z.url().meta({ description: 'Direct URL of the ImgBB asset' }),
  width: (f) => f.nonnegative().meta({ description: 'Image width in pixels' }),
  height: (f) =>
    f.nonnegative().meta({ description: 'Image height in pixels' }),
  size: (f) => f.nonnegative().meta({ description: 'Object size in bytes' }),
  fileName: (f) =>
    f
      .min(1)
      .max(255)
      .meta({ description: 'Uploaded filename', example: 'cover.png' }),
  mimeType: (f) =>
    f
      .min(1)
      .max(100)
      .meta({ description: 'Uploaded MIME type', example: 'image/png' }),
  deleteUrl: z
    .url()
    .meta({ description: 'Provider URL used to delete the asset' }),
});
export type ImgbbImage = z.infer<typeof ImgbbImage>;

export const Tag = createSelectSchema(tags, {
  name: (f) =>
    f.trim().min(1).max(50).meta({
      description: 'Human-readable tag name',
      example: 'Halal Crypto',
    }),
  slug: (f) =>
    f.trim().min(1).max(50).meta({
      description: 'URL-friendly tag identifier',
      example: 'halal-crypto',
    }),
  description: (f) => f.meta({ description: 'Additional tag context' }),
});
export type Tag = z.infer<typeof Tag>;

export const Token = createSelectSchema(tokens, {
  slug: (f) =>
    f.trim().min(1).max(100).meta({
      description: 'URL-friendly token identifier',
      example: 'bitcoin',
    }),
  rank: (f) =>
    f
      .int()
      .positive()
      .meta({ description: 'Global market-cap rank', example: 1 }),
  name: (f) =>
    f
      .trim()
      .min(1)
      .max(100)
      .meta({ description: 'Full cryptocurrency name', example: 'Bitcoin' }),
  ticker: (f) =>
    f
      .trim()
      .min(1)
      .max(20)
      .meta({ description: 'Short cryptocurrency symbol', example: 'BTC' }),
  shariaStatus: (f) =>
    f.meta({ description: 'Practical Sharia assessment', example: 'halal' }),
  status: (f) =>
    f.meta({
      description: 'Editorial publication status',
      example: 'published',
    }),
  excerpt: (f) => f.trim().min(1).meta({ description: 'Short token summary' }),
  tradingviewSymbol: (f) =>
    f.max(64).meta({ description: 'Optional TradingView symbol' }),
  website: z.url().meta({
    description: 'Official project website',
    example: 'https://bitcoin.org',
  }),
  content: (f) =>
    f
      .trim()
      .min(1)
      .meta({ description: 'Detailed Sharia analysis or project description' }),
});
export type Token = z.infer<typeof Token>;

export const Post = createSelectSchema(posts, {
  title: (f) =>
    f.trim().min(1).max(255).meta({
      description: 'Post title',
      example: 'Understanding Halal Crypto',
    }),
  slug: (f) =>
    f.trim().min(1).max(255).meta({
      description: 'URL-friendly post identifier',
      example: 'understanding-halal-crypto',
    }),
  excerpt: (f) => f.trim().min(1).meta({ description: 'Short post summary' }),
  content: (f) => f.trim().min(1).meta({ description: 'Full post content' }),
  section: (f) => f.meta({ description: 'Post section', example: 'education' }),
  type: (f) => f.meta({ description: 'Post content type', example: 'article' }),
  status: (f) =>
    f.meta({
      description: 'Editorial publication status',
      example: 'published',
    }),
  externalLink: (f) => f.meta({ description: 'Optional external source URL' }),
});
export type Post = z.infer<typeof Post>;

export const TokenTag = createSelectSchema(tokenTags, {
  displayOrder: (f) =>
    f.int().nonnegative().meta({ description: 'Optional display order' }),
});
export type TokenTag = z.infer<typeof TokenTag>;

export const PostTag = createSelectSchema(postTags, {
  displayOrder: (f) =>
    f.int().nonnegative().meta({ description: 'Optional display order' }),
});
export type PostTag = z.infer<typeof PostTag>;

export const Message = createSelectSchema(messages, {
  name: (f) =>
    f
      .trim()
      .min(2)
      .max(120)
      .meta({ description: 'Contact sender name', example: 'John Doe' }),
  email: z
    .email('Invalid email address')
    .max(255)
    .meta({ description: 'Contact sender email', example: 'john@example.com' }),
  message: (f) =>
    f.min(10).max(5000).meta({ description: 'Contact message body' }),
});
export type Message = z.infer<typeof Message>;
