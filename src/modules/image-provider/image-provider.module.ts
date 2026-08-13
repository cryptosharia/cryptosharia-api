import { Module } from '@nestjs/common';
import { ImageProviderAdapter } from './image-provider.adapter';
import { ImageProviderService } from './image-provider.service';

@Module({
  providers: [ImageProviderAdapter, ImageProviderService],
  exports: [ImageProviderService],
})
export class ImageProviderModule {}
