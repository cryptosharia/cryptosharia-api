import { createSelectSchema } from 'drizzle-zod';
import { tasks, users } from './drizzle.schema';
import { z } from 'zod';

export const User = createSelectSchema(users, {
  name: (f) =>
    f
      .min(1, 'Name cannot be empty')
      .meta({ description: 'Display name of the user', example: 'John Doe' }),
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

export const Task = createSelectSchema(tasks, {
  title: (f) =>
    f
      .min(1, 'Title cannot be empty')
      .meta({ description: 'Title of the task', example: 'Buy groceries' }),
  slug: (f) =>
    f
      .min(1, 'Slug cannot be empty')
      .meta({ description: 'Unique task slug', example: 'buy-groceries' }),
  description: (f) =>
    f.max(1000, 'Description cannot be longer than 1000 characters').meta({
      description: 'Detailed description of the task',
      example: 'Milk, eggs, bread, and butter',
    }),
  status: (f) =>
    f.meta({
      description: 'Current status of the task',
      example: 'pending',
    }),
});
export type Task = z.infer<typeof Task>;
