import { z } from 'zod';
import { User } from '#src/modules/drizzle/drizzle.types';

export const UserResponse = User.omit({
  hashedPassword: true,
  twoFactorSecret: true,
  passwordHashingAlgorithm: true,
});
export type UserResponse = z.infer<typeof UserResponse>;

export const UserParam = User.pick({ id: true });
export type UserParam = z.infer<typeof UserParam>;

export const UsersQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(255).optional(),
  roles: z.array(User.shape.role).optional(),
  statuses: z.array(User.shape.status).optional(),
});
export type UsersQuery = z.infer<typeof UsersQuery>;

export const ProfileUpdateBody = User.pick({ name: true, avatarId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one profile field is required',
  });
export type ProfileUpdateBody = z.infer<typeof ProfileUpdateBody>;

export const StatusBody = User.pick({ status: true });
export type StatusBody = z.infer<typeof StatusBody>;

export const RoleBody = User.pick({ role: true });
export type RoleBody = z.infer<typeof RoleBody>;
