import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  chmod,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StorageAdapter } from './storage.adapter';

const path = 'assets/12345678-1234-1234-1234-123456789abc-some-file.png';
describe('local storage', () => {
  let root: string;
  let adapter: StorageAdapter;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'storage-test-'));
    await chmod(root, 0o700);
    const values: Record<string, string> = {
      STORAGE_PROVIDER: 'local',
      STORAGE_LOCAL_ROOT: root,
      STORAGE_PUBLIC_BASE_URL: 'https://media.example/base',
    };
    adapter = new StorageAdapter({
      get: (key: string) => values[key],
    } as never);
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });
  it.each([
    '../' + path,
    'assets/abc-file.png',
    path + '/x',
    path + '?x',
    'temp/' + path + '.bad.ext',
    '/' + path,
  ])('rejects malformed path %s', async (pathname) => {
    await expect(
      adapter.upload({ pathname, file: new Blob(['x']) }),
    ).rejects.toMatchObject({ code: 'UPLOAD_FAILED' });
    await expect(adapter.delete(pathname, 'local')).rejects.toMatchObject({
      code: 'DELETION_FAILED',
    });
  });
  it('publishes complete content without overwriting and removes the temporary file', async () => {
    const result = await adapter.upload({
      pathname: path,
      file: new Blob(['hello']),
    });
    expect(result.url).toBe('https://media.example/base/' + path);
    expect(await readFile(join(root, path), 'utf8')).toBe('hello');
    await expect(
      adapter.upload({ pathname: path, file: new Blob(['other']) }),
    ).rejects.toThrow();
    expect(await readFile(join(root, path), 'utf8')).toBe('hello');
    expect(await readdir(join(root, 'assets'))).toEqual([path.split('/')[1]]);
    await adapter.delete(path, 'local');
    expect(await readdir(join(root, 'assets'))).toEqual([]);
  });
  it('supports the development prefix', async () => {
    await adapter.upload({ pathname: 'temp/' + path, file: new Blob(['x']) });
    expect(await readFile(join(root, 'temp', path), 'utf8')).toBe('x');
  });
  it('refuses symlink targets and directories', async () => {
    await adapter.upload({ pathname: path, file: new Blob(['x']) });
    await rm(join(root, path));
    const outside = join(root, 'outside');
    await writeFile(outside, 'safe');
    await symlink(outside, join(root, path));
    await expect(adapter.delete(path, 'local')).rejects.toThrow();
    await expect(
      adapter.upload({ pathname: path, file: new Blob(['x']) }),
    ).rejects.toThrow();
    expect(await readFile(outside, 'utf8')).toBe('safe');
    await rm(join(root, 'assets'), { recursive: true });
    await symlink(root, join(root, 'assets'));
    await expect(
      adapter.upload({ pathname: path, file: new Blob(['x']) }),
    ).rejects.toThrow();
  });
  it('uses each provider base URL independently', () => {
    const values: Record<string, string> = {
      STORAGE_PROVIDER: 'local',
      STORAGE_LOCAL_ROOT: root,
      STORAGE_PUBLIC_BASE_URL: 'https://media.example',
      VERCEL_BLOB_BASE_URL: 'https://blob.example',
    };
    const both = new StorageAdapter({
      get: (key: string) => values[key],
    } as never);
    expect(both.getPublicUrl(path, 'local')).toBe(
      'https://media.example/' + path,
    );
    expect(both.getPublicUrl(path, 'vercel_blob')).toBe(
      'https://blob.example/' + path,
    );
  });
  it('fails closed for legacy Blob without credentials', async () => {
    await expect(adapter.delete(path, 'vercel_blob')).rejects.toMatchObject({
      code: 'DELETION_FAILED',
    });
    expect(() => adapter.getPublicUrl(path, 'vercel_blob')).toThrow();
  });
});
