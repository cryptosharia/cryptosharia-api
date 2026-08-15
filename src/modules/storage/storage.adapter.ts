import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { del, put } from '@vercel/blob';
import { MAX_FILE_SIZE } from './storage.constants';
import { StorageError } from './storage.error';

@Injectable()
export class StorageAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(configService: ConfigService) {
    this.apiKey = configService.getOrThrow<string>('BLOB_READ_WRITE_TOKEN');
    this.baseUrl = configService.getOrThrow<string>('VERCEL_BLOB_BASE_URL');
  }

  async upload(input: {
    pathname: string;
    file: Blob;
    contentType?: string;
  }): Promise<{ url: string; pathname: string }> {
    // Reject before calling Vercel Blob so provider limits do not define API behavior.
    if (input.file.size > MAX_FILE_SIZE) {
      throw new StorageError('FILE_TOO_LARGE');
    }

    try {
      const blob = await put(input.pathname, input.file, {
        access: 'public',
        addRandomSuffix: false,
        contentType: input.contentType,
        token: this.apiKey,
      });
      return { url: blob.url, pathname: blob.pathname };
    } catch {
      throw new StorageError('UPLOAD_FAILED');
    }
  }

  async delete(pathnameOrUrl: string): Promise<void> {
    try {
      await del(pathnameOrUrl, { token: this.apiKey });
    } catch {
      throw new StorageError('DELETION_FAILED');
    }
  }

  getPublicUrl(pathname: string): string {
    if (pathname.startsWith('http')) return pathname;
    if (!this.baseUrl) return pathname;
    return `${this.baseUrl.replace(/\/+$/, '')}/${pathname.replace(/^\/+/, '')}`;
  }
}
