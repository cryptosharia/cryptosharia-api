import { z } from 'zod';
import { AssetMetadata } from '#src/modules/assets/assets.schemas';
import { User } from '#src/modules/drizzle/drizzle.types';

export const UserResponse = User.omit({ avatarId: true }).extend({
  avatar: AssetMetadata.nullable(),
});
export type UserResponse = z.infer<typeof UserResponse>;

export const UserParam = User.pick({ id: true });
export type UserParam = z.infer<typeof UserParam>;

export const UsersQuery = z.object({
  page: z.coerce
    .number()
    .int('Harus berupa bilangan bulat')
    .min(1, 'Minimal 1')
    .default(1)
    .meta({ description: 'Halaman' }),
  limit: z.coerce
    .number()
    .int('Harus berupa bilangan bulat')
    .min(1, 'Minimal 1')
    .max(100, 'Maksimal 100')
    .default(20)
    .meta({ description: 'Item per halaman' }),
  search: z.string().trim().max(255, 'Maksimal 255 karakter').optional().meta({
    description: 'Cari user berdasarkan nama atau email',
    example: 'john',
  }),
  roles: z
    .preprocess(
      (value) =>
        value === undefined
          ? undefined
          : Array.isArray(value)
            ? value
            : [value],
      z
        .array(User.shape.role)
        .optional()
        .meta({
          description: 'Filter berdasarkan role user',
          example: ['member'],
        }),
    )
    .optional(),
  statuses: z
    .preprocess(
      (value) =>
        value === undefined
          ? undefined
          : Array.isArray(value)
            ? value
            : [value],
      z
        .array(User.shape.status)
        .optional()
        .meta({
          description: 'Filter berdasarkan status akun',
          example: ['active'],
        }),
    )
    .optional(),
});
export type UsersQuery = z.infer<typeof UsersQuery>;

export const ProfileUpdateBody = User.pick({ name: true, avatarId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    error: 'Minimal satu field wajib diisi',
  });
export type ProfileUpdateBody = z.infer<typeof ProfileUpdateBody>;

export const StatusBody = User.pick({ status: true });
export type StatusBody = z.infer<typeof StatusBody>;

export const RoleBody = User.pick({ role: true });
export type RoleBody = z.infer<typeof RoleBody>;
