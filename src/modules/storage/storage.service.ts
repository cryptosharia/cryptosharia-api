import { Injectable } from '@nestjs/common';
import { StorageAdapter } from './storage.adapter';

@Injectable()
export class StorageService {
  constructor(private readonly storageAdapter: StorageAdapter) {}

  upload(input: { pathname: string; file: Blob; contentType?: string }) {
    return this.storageAdapter.upload(input);
  }

  delete(pathnameOrUrl: string) {
    return this.storageAdapter.delete(pathnameOrUrl);
  }

  getPublicUrl(pathname: string) {
    return this.storageAdapter.getPublicUrl(pathname);
  }
}
