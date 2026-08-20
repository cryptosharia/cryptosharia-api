import { Injectable } from '@nestjs/common';
import { AuditService } from '#src/modules/audit/audit.service';
import { AssetsService } from '#src/modules/assets/assets.service';
import { User } from '#src/modules/drizzle/drizzle.types';
import type { DbExecutor } from '#src/modules/drizzle/drizzle.types';
import { UsersRepository, type UserWithAvatar } from './users.repository';
import type { UserResponse } from './users.schemas';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly assetsService: AssetsService,
    private readonly auditService: AuditService,
  ) {}

  async selectById(
    id: User['id'],
    dbExecutor?: DbExecutor,
  ): Promise<UserResponse> {
    return this.toResponse(
      await this.usersRepository.selectById(id, dbExecutor),
    );
  }

  async insert(data: Pick<User, 'name' | 'email'>, dbExecutor?: DbExecutor) {
    return this.usersRepository.insert(data, dbExecutor);
  }

  async selectByEmail(email: User['email'], dbExecutor?: DbExecutor) {
    return this.usersRepository.selectByEmail(email, dbExecutor);
  }

  async selectAll(
    options: Parameters<UsersRepository['selectAll']>[0],
  ): Promise<UserResponse[]> {
    const records = await this.usersRepository.selectAll(options);
    return records.map((record) => this.toResponse(record));
  }

  async count(options: Parameters<UsersRepository['count']>[0]) {
    return this.usersRepository.count(options);
  }

  async update(
    id: User['id'],
    data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>,
    actor: { id: User['id']; ipAddress?: string },
    dbExecutor?: DbExecutor,
  ) {
    const user = await this.usersRepository.update(
      id,
      data,
      actor.id,
      dbExecutor,
    );

    await this.auditService.log({
      userId: actor.id,
      action: 'user.update',
      subjectType: 'user',
      subjectId: user.id,
      description: `Update user fields: ${Object.keys(data).join(', ')}`,
      ipAddress: actor.ipAddress,
    });

    return user;
  }

  async updateLastLoginAt(
    id: User['id'],
    lastLoginAt = new Date(),
    dbExecutor?: DbExecutor,
  ) {
    return this.usersRepository.update(
      id,
      { lastLoginAt },
      undefined,
      dbExecutor,
    );
  }

  private toResponse(record: UserWithAvatar): UserResponse {
    return {
      id: record.user.id,
      name: record.user.name,
      email: record.user.email,
      role: record.user.role,
      status: record.user.status,
      lastLoginAt: record.user.lastLoginAt,
      createdAt: record.user.createdAt,
      updatedAt: record.user.updatedAt,
      updatedBy: record.user.updatedBy,
      avatar: this.assetsService.toAssetMetadata(record.avatar),
    };
  }
}
