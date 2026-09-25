import { Module } from '@nestjs/common';
import { AssetsModule } from '#src/modules/assets/assets.module';
import { AuditModule } from '#src/modules/audit/audit.module';
import { DrizzleModule } from '#src/modules/drizzle/drizzle.module';
import { TeamMembersController } from './team-members.controller';
import { TeamMembersRepository } from './team-members.repository';
import { TeamMembersService } from './team-members.service';

@Module({
  imports: [DrizzleModule, AssetsModule, AuditModule],
  controllers: [TeamMembersController],
  providers: [TeamMembersRepository, TeamMembersService],
  exports: [TeamMembersService, TeamMembersRepository],
})
export class TeamMembersModule {}
