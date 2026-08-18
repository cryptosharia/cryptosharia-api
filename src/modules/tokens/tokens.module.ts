import { Module } from '@nestjs/common';
import { AssetsModule } from '#src/modules/assets/assets.module';
import { AuditModule } from '#src/modules/audit/audit.module';
import { DrizzleModule } from '#src/modules/drizzle/drizzle.module';
import { MarketDataModule } from '#src/modules/market-data/market-data.module';
import { SecurityModule } from '#src/modules/security/security.module';
import { TagsModule } from '#src/modules/tags/tags.module';
import { TokensController } from './tokens.controller';
import { TokensRepository } from './tokens.repository';
import { TokensService } from './tokens.service';

@Module({
  imports: [
    DrizzleModule,
    SecurityModule,
    TagsModule,
    AssetsModule,
    AuditModule,
    MarketDataModule,
  ],
  controllers: [TokensController],
  providers: [TokensRepository, TokensService],
})
export class TokensModule {}
