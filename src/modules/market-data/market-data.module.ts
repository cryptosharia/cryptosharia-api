import { Module } from '@nestjs/common';
import { MarketDataAdapter } from './market-data.adapter';
import { MarketDataService } from './market-data.service';

@Module({
  providers: [MarketDataAdapter, MarketDataService],
  exports: [MarketDataService],
})
export class MarketDataModule {}
