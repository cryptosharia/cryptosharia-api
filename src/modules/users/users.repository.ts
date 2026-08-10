import { Injectable } from '@nestjs/common';
import { DrizzleQueryError, eq } from 'drizzle-orm';
import { users } from '#src/modules/drizzle/drizzle.schema';
import { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import { User } from '#src/modules/drizzle/drizzle.types';
import { UsersError } from './users.error';
import { DatabaseError } from 'pg';

@Injectable()
export class UsersRepository {
  constructor(private readonly drizzleService: DrizzleService) {}
  async selectAll(): Promise<User[]> {
    return this.drizzleService.db.select().from(users);
  }

  async selectById(id: User['id']): Promise<User> {
    const [user] = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.id, id));
    if (!user) throw new UsersError('USER_NOT_FOUND');
    return user;
  }

  async insert(
    data: Pick<User, 'name' | 'email' | 'passwordHash'>,
  ): Promise<User> {
    try {
      const [user] = await this.drizzleService.db
        .insert(users)
        .values(data)
        .returning();

      return user;
    } catch (error) {
      if (error instanceof DrizzleQueryError) {
        if (error.cause instanceof DatabaseError) {
          if (error.cause.code === '23505') {
            throw new UsersError('EMAIL_UNIQUE_VIOLATION');
          }
        }
      }
      throw error;
    }
  }
}
