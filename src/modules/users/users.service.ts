import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { User } from '#src/modules/drizzle/drizzle.types';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async selectById(id: User['id']) {
    return this.usersRepository.selectById(id);
  }

  async insert(data: Pick<User, 'name' | 'email' | 'hashedPassword'>) {
    return this.usersRepository.insert(data);
  }

  async selectByEmail(email: User['email']) {
    return this.usersRepository.selectByEmail(email);
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
  ) {
    return this.usersRepository.update(id, data, updatedBy);
  }
}
