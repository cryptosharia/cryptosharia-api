import { z } from 'zod';
import { User } from '#src/modules/drizzle/drizzle.types';

export const UserResponse = User.omit({ passwordHash: true });
export type UserResponse = z.infer<typeof UserResponse>;

export const UserParam = User.pick({ id: true });
export type UserParam = z.infer<typeof UserParam>;
