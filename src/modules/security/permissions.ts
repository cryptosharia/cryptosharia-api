import type { User } from '#src/modules/drizzle/drizzle.types';

export const ALL_PERMISSIONS = [
  'posts.manage',
  'posts.read',
  'tokens.manage',
  'tags.manage',
  'users.read',
  'users.update',
  'users.manage_status',
  'users.manage_role',
  'messages.read',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<User['role'], Permission[]> = {
  super_admin: [...ALL_PERMISSIONS],
  admin: ALL_PERMISSIONS.filter(
    (permission) =>
      permission !== 'users.manage_role' &&
      permission !== 'users.manage_status',
  ),
  posts_manager: ['posts.manage', 'tags.manage'],
  tokens_manager: ['tokens.manage', 'tags.manage'],
  member: [],
};
