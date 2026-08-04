import { z } from 'zod';
import { Task } from '#src/modules/drizzle/drizzle.types';

export const TaskResponse = Task;
export type TaskResponse = z.infer<typeof TaskResponse>;

export const InsertBody = Task.pick({
  title: true,
  slug: true,
  description: true,
});
export type InsertBody = z.infer<typeof InsertBody>;

export const UpdateBody = Task.pick({
  title: true,
  slug: true,
  description: true,
  status: true,
}).partial();
export type UpdateBody = z.infer<typeof UpdateBody>;

export const TaskParam = Task.pick({ id: true });
export type TaskParam = z.infer<typeof TaskParam>;
