import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageAdapter } from './storage.adapter';

@Module({
  providers: [StorageAdapter, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
