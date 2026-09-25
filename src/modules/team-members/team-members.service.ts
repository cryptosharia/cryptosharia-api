import { Injectable } from '@nestjs/common';
import { AssetsService } from '#src/modules/assets/assets.service';
import { AuditService } from '#src/modules/audit/audit.service';
import type { User } from '#src/modules/drizzle/drizzle.types';
import {
  TeamMembersRepository,
  type TeamMemberWithRelation,
} from './team-members.repository';
import type {
  TeamMemberCreateBody,
  TeamMemberResponse,
  TeamMembersQuery,
  TeamMemberUpdateBody,
} from './team-members.schemas';

@Injectable()
export class TeamMembersService {
  constructor(
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly assetsService: AssetsService,
    private readonly auditService: AuditService,
  ) {}

  async selectAll(query: TeamMembersQuery): Promise<TeamMemberResponse[]> {
    const records = await this.teamMembersRepository.selectAll(query);
    return records.map((record) => this.toResponse(record));
  }

  count(query: TeamMembersQuery): Promise<number> {
    return this.teamMembersRepository.count(query);
  }

  async selectByIdentifier(identifier: string): Promise<TeamMemberResponse> {
    const record = await this.teamMembersRepository.selectByIdentifier(identifier);
    return this.toResponse(record);
  }

  async create(
    data: TeamMemberCreateBody,
    actor: { id: User['id']; ipAddress?: string },
  ): Promise<TeamMemberResponse> {
    const record = await this.teamMembersRepository.create(data, actor);
    await this.auditService.log({
      userId: actor.id,
      action: 'team.create' as any,
      subjectType: 'user' as any,
      subjectId: record.teamMember.id,
      description: `Menambahkan anggota tim: ${record.teamMember.name}`,
      ipAddress: actor.ipAddress,
    });
    return this.toResponse(record);
  }

  async update(
    id: string,
    data: TeamMemberUpdateBody,
    actor: { id: User['id']; ipAddress?: string },
  ): Promise<TeamMemberResponse> {
    const record = await this.teamMembersRepository.update(id, data, actor);
    await this.auditService.log({
      userId: actor.id,
      action: 'team.update' as any,
      subjectType: 'user' as any,
      subjectId: record.teamMember.id,
      description: `Memperbarui anggota tim: ${record.teamMember.name}`,
      ipAddress: actor.ipAddress,
    });
    return this.toResponse(record);
  }

  async delete(
    id: string,
    actor: { id: User['id']; ipAddress?: string },
  ): Promise<void> {
    const record = await this.teamMembersRepository.selectByIdentifier(id);
    await this.teamMembersRepository.delete(id, actor);
    await this.auditService.log({
      userId: actor.id,
      action: 'team.delete' as any,
      subjectType: 'user' as any,
      subjectId: record.teamMember.id,
      description: `Menghapus anggota tim: ${record.teamMember.name}`,
      ipAddress: actor.ipAddress,
    });
  }

  private toResponse(record: TeamMemberWithRelation): TeamMemberResponse {
    const { teamMember, imageAsset, createdBy, updatedBy } = record;

    let image = teamMember.imageUrl || '';
    if (imageAsset) {
      const assetMeta = this.assetsService.toAssetMetadata(imageAsset);
      if (assetMeta?.url) {
        image = assetMeta.url;
      }
    }

    return {
      id: teamMember.id,
      slug: teamMember.slug,
      name: teamMember.name,
      credentials: teamMember.credentials,
      role: teamMember.role,
      image,
      imageId: teamMember.imageId,
      imageUrl: teamMember.imageUrl,
      description: teamMember.description,
      focus: teamMember.focus,
      contribution: teamMember.contribution,
      joined: teamMember.joined,
      expertise: (teamMember.expertise as Array<{ title: string; description: string }>) || [],
      orderIndex: teamMember.orderIndex,
      isActive: teamMember.isActive,
      createdAt: teamMember.createdAt,
      updatedAt: teamMember.updatedAt,
      createdBy,
      updatedBy,
    };
  }
}
