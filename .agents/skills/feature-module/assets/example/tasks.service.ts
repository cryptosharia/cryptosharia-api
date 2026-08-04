import { Injectable } from '@nestjs/common';
import { TasksRepository } from './tasks.repository';
import { Task, User } from '#src/modules/drizzle/drizzle.types';

@Injectable()
export class TasksService {
  constructor(private readonly tasksRepository: TasksRepository) {}

  async selectAll(userId: User['id']) {
    return this.tasksRepository.selectAll(userId);
  }

  async selectById(id: Task['id'], userId: User['id']) {
    return this.tasksRepository.selectById(id, userId);
  }

  async insert(
    userId: User['id'],
    data: Pick<Task, 'title' | 'slug' | 'description'>,
  ) {
    return this.tasksRepository.insert({ ...data, userId });
  }

  async update(
    id: Task['id'],
    userId: User['id'],
    data: Partial<Pick<Task, 'title' | 'slug' | 'description' | 'status'>>,
  ) {
    return this.tasksRepository.update(id, userId, data);
  }

  async delete(id: Task['id'], userId: User['id']) {
    await this.tasksRepository.delete(id, userId);
  }
}
