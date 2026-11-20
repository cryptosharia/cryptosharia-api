import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlobNotFoundError, del, put } from '@vercel/blob';
import { constants } from 'node:fs';
import { lstat, mkdir, open, link, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { MAX_FILE_SIZE } from './storage.constants';
import { StorageError } from './storage.error';

export type StorageProvider = 'vercel_blob' | 'local';
const canonicalPath =
  /^(?:temp\/)?assets\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+)?$/;

@Injectable()
export class StorageAdapter {
  readonly provider: StorageProvider;
  private readonly apiKey?: string;
  private readonly blobUrl?: string;
  private readonly localRoot?: string;
  private readonly localUrl?: string;

  constructor(config: ConfigService) {
    this.provider =
      config.get<StorageProvider>('STORAGE_PROVIDER') ?? 'vercel_blob';
    this.apiKey =
      config.get<string>('BLOB_READ_WRITE_TOKEN') ??
      (this.provider === 'vercel_blob'
        ? config.getOrThrow<string>('BLOB_READ_WRITE_TOKEN')
        : undefined);
    this.blobUrl =
      config.get<string>('VERCEL_BLOB_BASE_URL') ??
      (this.provider === 'vercel_blob'
        ? config.getOrThrow<string>('VERCEL_BLOB_BASE_URL')
        : undefined);
    this.localRoot = config.get<string>('STORAGE_LOCAL_ROOT');
    this.localUrl = config.get<string>('STORAGE_PUBLIC_BASE_URL');
  }

  private async localPath(pathname: string, create: boolean): Promise<string> {
    if (!canonicalPath.test(pathname) || !this.localRoot)
      throw new Error('Invalid local path');
    const parts = pathname.split('/');
    let dir = this.localRoot;
    const root = await lstat(dir);
    if (!root.isDirectory() || root.isSymbolicLink())
      throw new Error('Invalid storage root');
    for (const part of parts.slice(0, -1)) {
      dir = join(dir, part);
      if (create)
        await mkdir(dir, { mode: 0o755 }).catch(
          (error: NodeJS.ErrnoException) => {
            if (error.code !== 'EEXIST') throw error;
          },
        );
      const stat = await lstat(dir);
      if (!stat.isDirectory() || stat.isSymbolicLink())
        throw new Error('Invalid storage directory');
    }
    return join(dir, parts[parts.length - 1]);
  }

  async upload(input: {
    pathname: string;
    file: Blob;
    contentType?: string;
  }): Promise<{ url: string; pathname: string }> {
    if (input.file.size > MAX_FILE_SIZE)
      throw new StorageError('FILE_TOO_LARGE');
    try {
      if (this.provider === 'local') {
        const target = await this.localPath(input.pathname, true);
        const temporary = join(
          target.substring(0, target.lastIndexOf('/')),
          `.upload-${randomUUID()}`,
        );
        let created = false;
        try {
          const handle = await open(
            temporary,
            constants.O_CREAT |
              constants.O_EXCL |
              constants.O_WRONLY |
              constants.O_NOFOLLOW,
            0o644,
          );
          created = true;
          try {
            await handle.writeFile(Buffer.from(await input.file.arrayBuffer()));
            await handle.sync();
          } finally {
            await handle.close();
          }
          await link(temporary, target);
          await unlink(temporary);
          created = false;
        } finally {
          if (created) await unlink(temporary);
        }
        return {
          pathname: input.pathname,
          url: this.getPublicUrl(input.pathname, 'local'),
        };
      }
      if (!this.apiKey) throw new Error('Blob unavailable');
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

  async delete(
    pathname: string,
    provider: StorageProvider = this.provider,
  ): Promise<void> {
    try {
      if (provider === 'local') {
        const target = await this.localPath(pathname, false);
        const stat = await lstat(target);
        if (!stat.isFile() || stat.isSymbolicLink())
          throw new Error('Invalid target');
        await unlink(target);
      } else if (provider === 'vercel_blob') {
        if (!this.apiKey) throw new Error('Blob unavailable');
        await del(pathname, { token: this.apiKey });
      } else throw new Error('Unknown provider');
    } catch (error) {
      if (provider === 'vercel_blob' && error instanceof BlobNotFoundError)
        return;
      throw new StorageError('DELETION_FAILED');
    }
  }

  getPublicUrl(
    pathname: string,
    provider: StorageProvider = this.provider,
  ): string {
    if (provider === 'vercel_blob' && pathname.startsWith('http'))
      return pathname;
    const base =
      provider === 'local'
        ? this.localUrl
        : provider === 'vercel_blob'
          ? this.blobUrl
          : undefined;
    if (!base || (provider === 'local' && !canonicalPath.test(pathname)))
      throw new StorageError('UPLOAD_FAILED');
    return `${base.replace(/\/+$/, '')}/${pathname.replace(/^\/+/, '')}`;
  }
}
