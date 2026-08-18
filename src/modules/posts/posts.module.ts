import { Module } from '@nestjs/common';
import { AssetsModule } from '#src/modules/assets/assets.module';
import { AuditModule } from '#src/modules/audit/audit.module';
import { DrizzleModule } from '#src/modules/drizzle/drizzle.module';
import { SecurityModule } from '#src/modules/security/security.module';
import { TagsModule } from '#src/modules/tags/tags.module';
import { PostsController } from './posts.controller';
import { PostsRepository } from './posts.repository';
import { PostsService } from './posts.service';

@Module({
  imports: [
    DrizzleModule,
    SecurityModule,
    TagsModule,
    AssetsModule,
    AuditModule,
  ],
  controllers: [PostsController],
  providers: [PostsRepository, PostsService],
})
export class PostsModule {}
