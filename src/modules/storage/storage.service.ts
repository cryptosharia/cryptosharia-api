import { Injectable } from '@nestjs/common';
import { StorageAdapter, type StorageProvider } from './storage.adapter';

@Injectable()
export class StorageService {
  constructor(private readonly storageAdapter: StorageAdapter) {}

  get provider() {
    return this.storageAdapter.provider;
  }

  upload(input: { pathname: string; file: Blob; contentType?: string }) {
    return this.storageAdapter.upload(input);
  }

  delete(pathnameOrUrl: string, provider?: StorageProvider) {
    return this.storageAdapter.delete(pathnameOrUrl, provider);
  }

  getPublicUrl(pathname: string, provider?: StorageProvider) {
    return this.storageAdapter.getPublicUrl(pathname, provider);
  }
}
