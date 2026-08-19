import { Injectable } from '@nestjs/common';
import {
  and,
  desc,
  DrizzleQueryError,
  eq,
  ilike,
  inArray,
  or,
  sql,
  SQL,
} from 'drizzle-orm';
import { users, assets } from '#src/modules/drizzle/drizzle.schema';
import { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import type { Asset, DbExecutor } from '#src/modules/drizzle/drizzle.types';
import { User } from '#src/modules/drizzle/drizzle.types';
import { escapeLikePattern } from '#src/common/escape-like-pattern';
import { UsersError } from './users.error';
import { DatabaseError } from 'pg';

export type UserWithAvatar = {
  user: User;
  avatar: Asset | null;
};

@Injectable()
export class UsersRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  private selectWithAvatar(dbExecutor: DbExecutor) {
    return dbExecutor
      .select({ user: users, avatar: assets })
      .from(users)
      .leftJoin(assets, eq(users.avatarId, assets.id));
  }

  private normalizeAvatar(rows: { user: User; avatar: Asset | null }[]) {
    return rows.map((row) => ({
      user: row.user,
      avatar: row.avatar?.id ? row.avatar : null,
    }));
  }

  private buildListWhere(options: {
    search?: string;
    roles?: User['role'][];
    statuses?: User['status'][];
  }): SQL | undefined {
    const filters: SQL[] = [];
    if (options.search) {
      const search = `%${escapeLikePattern(options.search)}%`;
      const searchCondition = or(
        ilike(users.name, search),
        ilike(users.email, search),
      );
      if (searchCondition) filters.push(searchCondition);
    }

    if (options.roles?.length) filters.push(inArray(users.role, options.roles));

    if (options.statuses?.length)
      filters.push(inArray(users.status, options.statuses));

    return filters.length ? and(...filters) : undefined;
  }

  async selectById(
    id: User['id'],
    dbExecutor: DbExecutor = this.drizzleService.db,
  ): Promise<UserWithAvatar> {
    const [row] = await this.selectWithAvatar(dbExecutor).where(
      eq(users.id, id),
    );
    if (!row) throw new UsersError('USER_NOT_FOUND');
    return this.normalizeAvatar([row])[0];
  }

  async selectByEmail(
    email: User['email'],
    dbExecutor: DbExecutor = this.drizzleService.db,
  ): Promise<User> {
    const [user] = await dbExecutor
      .select()
      .from(users)
      .where(eq(users.email, email));
    if (!user) throw new UsersError('USER_NOT_FOUND');
    return user;
  }

  async selectAll(options: {
    search?: string;
    roles?: User['role'][];
    statuses?: User['status'][];
    page: number;
    limit: number;
  }): Promise<UserWithAvatar[]> {
    const rows = await this.selectWithAvatar(this.drizzleService.db)
      .where(this.buildListWhere(options))
      .orderBy(desc(users.createdAt))
      .limit(options.limit)
      .offset((options.page - 1) * options.limit);
    return this.normalizeAvatar(rows);
  }

  async count(options: {
    search?: string;
    roles?: User['role'][];
    statuses?: User['status'][];
  }): Promise<number> {
    const [result] = await this.drizzleService.db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(this.buildListWhere(options));
    return Number(result?.count ?? 0);
  }

  /** Creates a member account with the Users table's non-privileged defaults. */
  async insert(
    data: Pick<User, 'name' | 'email'>,
    dbExecutor: DbExecutor = this.drizzleService.db,
  ): Promise<User> {
    try {
      const [user] = await dbExecutor
        .insert(users)
        .values({
          ...data,
          role: 'member',
          status: 'active',
        })
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

  async update(
    id: User['id'],
    data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>,
    updatedBy?: User['id'],
    dbExecutor: DbExecutor = this.drizzleService.db,
  ): Promise<User> {
    const [user] = await dbExecutor
      .update(users)
      .set({ ...data, ...(updatedBy ? { updatedBy } : {}) })
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new UsersError('USER_NOT_FOUND');
    return user;
  }
}
