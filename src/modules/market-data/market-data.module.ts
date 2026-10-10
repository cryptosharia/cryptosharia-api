import { Module } from '@nestjs/common';
import { RedisModule } from '#src/modules/redis/redis.module';
import { MarketDataAdapter } from './market-data.adapter';
import { MarketDataService } from './market-data.service';

@Module({
  imports: [RedisModule],
  providers: [MarketDataAdapter, MarketDataService],
  exports: [MarketDataService],
})
export class MarketDataModule {}
