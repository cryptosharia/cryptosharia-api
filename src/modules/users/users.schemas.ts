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

export const UserUpdateBody = User.pick({
  name: true,
  avatarId: true,
  status: true,
  role: true,
})
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    error: 'Minimal satu field wajib diisi',
  });
export type UserUpdateBody = z.infer<typeof UserUpdateBody>;

export const UserCreateBody = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nama minimal 2 karakter')
    .max(120, 'Nama maksimal 120 karakter'),
  email: z
    .string()
    .trim()
    .email('Format email tidak valid')
    .max(255, 'Email maksimal 255 karakter'),
  password: z
    .string()
    .min(12, 'Password minimal 12 karakter')
    .max(128, 'Password maksimal 128 karakter'),
  role: User.shape.role.default('member'),
  status: User.shape.status.default('active'),
});
export type UserCreateBody = z.infer<typeof UserCreateBody>;
