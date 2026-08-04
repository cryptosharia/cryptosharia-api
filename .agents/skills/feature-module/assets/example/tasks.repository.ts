import { Injectable } from '@nestjs/common';
import { and, DrizzleQueryError, eq } from 'drizzle-orm';
import { tasks } from '#src/modules/drizzle/drizzle.schema';
import { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import { Task } from '#src/modules/drizzle/drizzle.types';
import { DatabaseError } from 'pg';
import { TasksError } from './tasks.error';

@Injectable()
export class TasksRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async selectAll(userId: Task['userId']): Promise<Task[]> {
    return this.drizzleService.db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId));
  }

  async selectById(id: Task['id'], userId: Task['userId']): Promise<Task> {
    const [task] = await this.drizzleService.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

    if (!task) throw new TasksError('NOT_FOUND');

    return task;
  }

  async insert(
    data: Pick<Task, 'title' | 'slug' | 'description' | 'userId'>,
  ): Promise<Task> {
    try {
      const [task] = await this.drizzleService.db
        .insert(tasks)
        .values(data)
        .returning();

      return task;
    } catch (error) {
      if (error instanceof DrizzleQueryError) {
        if (error.cause instanceof DatabaseError) {
          if (error.cause.code === '23505') {
            throw new TasksError('SLUG_UNIQUE_VIOLATION');
          }
        }
      }
      throw error;
    }
  }

  async update(
    id: Task['id'],
    userId: Task['userId'],
    data: Partial<Pick<Task, 'title' | 'slug' | 'description' | 'status'>>,
  ): Promise<Task> {
    try {
      const [task] = await this.drizzleService.db
        .update(tasks)
        .set(data)
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
        .returning();

      if (!task) throw new TasksError('NOT_FOUND');

      return task;
    } catch (error) {
      if (error instanceof DrizzleQueryError) {
        if (error.cause instanceof DatabaseError) {
          if (error.cause.code === '23505') {
            throw new TasksError('SLUG_UNIQUE_VIOLATION');
          }
        }
      }
      throw error;
    }
  }

  async delete(id: Task['id'], userId: Task['userId']): Promise<void> {
    const [task] = await this.drizzleService.db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

    if (!task) throw new TasksError('NOT_FOUND');
  }
}
