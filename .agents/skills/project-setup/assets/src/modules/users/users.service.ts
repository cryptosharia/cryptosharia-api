import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { User } from '#src/modules/drizzle/drizzle.types';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}
  async selectAll(): Promise<User[]> {
    return this.usersRepository.selectAll();
  }
  async selectById(id: User['id']): Promise<User> {
    return this.usersRepository.selectById(id);
  }

  async insert(data: Pick<User, 'name' | 'email' | 'password'>): Promise<User> {
    return this.usersRepository.insert(data);
  }
}
