import { Module } from '@nestjs/common';
import { AuditModule } from '#src/modules/audit/audit.module';
import { DrizzleModule } from '#src/modules/drizzle/drizzle.module';
import { SecurityModule } from '#src/modules/security/security.module';
import { TagsController } from './tags.controller';
import { TagsRepository } from './tags.repository';
import { TagsService } from './tags.service';

@Module({
  imports: [DrizzleModule, AuditModule, SecurityModule],
  controllers: [TagsController],
  providers: [TagsRepository, TagsService],
  exports: [TagsService],
})
export class TagsModule {}
