import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  DrizzleQueryError,
  eq,
  ilike,
  or,
  type SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DatabaseError } from 'pg';
import { escapeLikePattern } from '#src/common/escape-like-pattern';
import { isUuid } from '#src/common/is-uuid';
import type { AuditMetadata } from '#src/modules/audit/audit.schemas';
import {
  assets,
  teamMembers,
  users,
} from '#src/modules/drizzle/drizzle.schema';
import { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import type {
  Asset,
  DbExecutor,
  TeamMember,
  User,
} from '#src/modules/drizzle/drizzle.types';
import { TeamMembersError } from './team-members.error';
import type {
  TeamMemberCreateBody,
  TeamMembersQuery,
  TeamMemberUpdateBody,
} from './team-members.schemas';

export type TeamMemberWithRelation = {
  teamMember: TeamMember;
  imageAsset: Asset | null;
  createdBy: AuditMetadata['createdBy'];
  updatedBy: AuditMetadata['updatedBy'];
};

const createdByUser = alias(users, 'tm_created_by');
const updatedByUser = alias(users, 'tm_updated_by');

@Injectable()
export class TeamMembersRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  private selectBase(dbExecutor: DbExecutor) {
    return dbExecutor
      .select({
        teamMember: teamMembers,
        imageAsset: assets,
        createdBy: {
          id: createdByUser.id,
          name: createdByUser.name,
          email: createdByUser.email,
        },
        updatedBy: {
          id: updatedByUser.id,
          name: updatedByUser.name,
          email: updatedByUser.email,
        },
      })
      .from(teamMembers)
      .leftJoin(assets, eq(teamMembers.imageId, assets.id))
      .leftJoin(createdByUser, eq(teamMembers.createdBy, createdByUser.id))
      .leftJoin(updatedByUser, eq(teamMembers.updatedBy, updatedByUser.id));
  }

  async selectAll(input: TeamMembersQuery): Promise<TeamMemberWithRelation[]> {
    const filters = this.buildFilters(input);
    const where = filters.length ? and(...filters) : undefined;

    const orderColumn = {
      orderIndex: teamMembers.orderIndex,
      name: teamMembers.name,
      createdAt: teamMembers.createdAt,
    }[input.sortBy];
    const order = input.sortDirection === 'desc' ? desc(orderColumn) : asc(orderColumn);

    return this.selectBase(this.drizzleService.db)
      .where(where)
      .orderBy(order, asc(teamMembers.createdAt))
      .limit(input.limit)
      .offset((input.page - 1) * input.limit);
  }

  async count(input: TeamMembersQuery): Promise<number> {
    const filters = this.buildFilters(input);
    const where = filters.length ? and(...filters) : undefined;

    const [result] = await this.drizzleService.db
      .select({ count: count() })
      .from(teamMembers)
      .where(where);
    return Number(result?.count ?? 0);
  }

  async selectByIdentifier(identifier: string): Promise<TeamMemberWithRelation> {
    const condition = isUuid(identifier)
      ? eq(teamMembers.id, identifier)
      : eq(teamMembers.slug, identifier);

    const [record] = await this.selectBase(this.drizzleService.db).where(condition);
    if (!record) {
      throw new TeamMembersError('TEAM_MEMBER_NOT_FOUND', `Anggota tim '${identifier}' tidak ditemukan`);
    }
    return record;
  }

  async create(
    data: TeamMemberCreateBody,
    actor: { id: User['id']; ipAddress?: string },
  ): Promise<TeamMemberWithRelation> {
    try {
      const [inserted] = await this.drizzleService.db
        .insert(teamMembers)
        .values({
          ...data,
          createdBy: actor.id,
          updatedBy: actor.id,
        })
        .returning();

      return this.selectByIdentifier(inserted.id);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async update(
    id: string,
    data: TeamMemberUpdateBody,
    actor: { id: User['id']; ipAddress?: string },
  ): Promise<TeamMemberWithRelation> {
    // Ensure exists
    await this.selectByIdentifier(id);

    try {
      const [updated] = await this.drizzleService.db
        .update(teamMembers)
        .set({
          ...data,
          updatedBy: actor.id,
          updatedAt: new Date(),
        })
        .where(isUuid(id) ? eq(teamMembers.id, id) : eq(teamMembers.slug, id))
        .returning();

      if (!updated) {
        throw new TeamMembersError('TEAM_MEMBER_NOT_FOUND');
      }

      return this.selectByIdentifier(updated.id);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async delete(
    id: string,
    _actor: { id: User['id']; ipAddress?: string },
  ): Promise<void> {
    const record = await this.selectByIdentifier(id);
    await this.drizzleService.db
      .delete(teamMembers)
      .where(eq(teamMembers.id, record.teamMember.id));
  }

  private buildFilters(input: TeamMembersQuery): SQL[] {
    const filters: SQL[] = [];

    if (input.isActive !== undefined) {
      filters.push(eq(teamMembers.isActive, input.isActive));
    }

    if (input.search) {
      const pattern = `%${escapeLikePattern(input.search)}%`;
      filters.push(
        or(
          ilike(teamMembers.name, pattern),
          ilike(teamMembers.role, pattern),
          ilike(teamMembers.focus, pattern),
          ilike(teamMembers.description, pattern),
        )!,
      );
    }

    return filters;
  }

  private handleDatabaseError(error: unknown): never {
    if (error instanceof DrizzleQueryError && error.cause instanceof DatabaseError) {
      if (error.cause.code === '23505') {
        throw new TeamMembersError('SLUG_ALREADY_EXISTS', 'Slug anggota tim sudah digunakan.');
      }
    }
    throw error;
  }
}
