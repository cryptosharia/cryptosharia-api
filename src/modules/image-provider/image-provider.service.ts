import { Injectable } from '@nestjs/common';
import { ImageProviderAdapter } from './image-provider.adapter';

@Injectable()
export class ImageProviderService {
  constructor(private readonly imageProviderAdapter: ImageProviderAdapter) {}

  upload(input: { file: Blob; filename: string; contentType: string }) {
    return this.imageProviderAdapter.upload(input);
  }
}
