import { createSelectSchema } from 'drizzle-zod';
import { users } from './drizzle.schema';
import { z } from 'zod';

export const User = createSelectSchema(users, {
  name: (f) =>
    f
      .min(1, 'Name cannot be empty')
      .meta({ description: 'Display name', example: 'John Doe' }),
  email: z.email('Invalid email address').meta({
    description: 'Email address used for signin',
    example: 'john@example.com',
  }),
  password: (f) =>
    f.min(12, 'Password must be at least 12 characters').meta({
      description: 'Account password, minimum 12 characters',
      example: 'securePass123!',
    }),
});
export type User = z.infer<typeof User>;
