import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { User } from '#src/modules/drizzle/drizzle.types';
import type { DbExecutor } from '#src/modules/drizzle/drizzle.types';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async selectById(id: User['id'], dbExecutor?: DbExecutor) {
    return this.usersRepository.selectById(id, dbExecutor);
  }

  async insert(data: Pick<User, 'name' | 'email'>, dbExecutor?: DbExecutor) {
    return this.usersRepository.insert(data, dbExecutor);
  }

  async selectByEmail(email: User['email'], dbExecutor?: DbExecutor) {
    return this.usersRepository.selectByEmail(email, dbExecutor);
  }

  async selectAll(options: Parameters<UsersRepository['selectAll']>[0]) {
    return this.usersRepository.selectAll(options);
  }

  async count(options: Parameters<UsersRepository['count']>[0]) {
    return this.usersRepository.count(options);
  }

  async update(
    id: User['id'],
    data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>,
    updatedBy?: User['id'],
    dbExecutor?: DbExecutor,
  ) {
    return this.usersRepository.update(id, data, updatedBy, dbExecutor);
  }
}
