import { Module } from '@nestjs/common';
import { AuditModule } from '#src/modules/audit/audit.module';
import { DrizzleModule } from '#src/modules/drizzle/drizzle.module';
import { ImageProviderModule } from '#src/modules/image-provider/image-provider.module';
import { SecurityModule } from '#src/modules/security/security.module';
import { StorageModule } from '#src/modules/storage/storage.module';
import { AssetsController } from './assets.controller';
import { AssetsRepository } from './assets.repository';
import { AssetsService } from './assets.service';

@Module({
  imports: [
    DrizzleModule,
    StorageModule,
    ImageProviderModule,
    AuditModule,
    SecurityModule,
  ],
  controllers: [AssetsController],
  providers: [AssetsRepository, AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
