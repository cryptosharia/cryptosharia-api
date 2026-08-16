import { del, put } from '@vercel/blob';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_FILE_SIZE } from './storage.constants';
import { StorageAdapter } from './storage.adapter';
import { StorageError } from './storage.error';

vi.mock('@vercel/blob', () => ({
  del: vi.fn(),
  put: vi.fn(),
  BlobNotFoundError: class BlobNotFoundError extends Error {},
}));

describe('StorageAdapter', () => {
  const config = {
    getOrThrow: vi.fn((key: string) =>
      key === 'BLOB_READ_WRITE_TOKEN'
        ? 'blob-token'
        : 'https://blob.example.com',
    ),
    get: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads a Blob and maps the provider result', async () => {
    vi.mocked(put).mockResolvedValue({
      url: 'https://blob.example.com/assets/file.png',
      pathname: 'assets/file.png',
      contentType: 'image/png',
      contentDisposition: 'inline',
      downloadUrl: 'https://blob.example.com/assets/file.png',
      etag: 'etag',
    });
    const adapter = new StorageAdapter(config as never);
    const file = new Blob(['file'], { type: 'image/png' });

    await expect(
      adapter.upload({
        pathname: 'assets/file.png',
        file,
        contentType: 'image/png',
      }),
    ).resolves.toEqual({
      url: 'https://blob.example.com/assets/file.png',
      pathname: 'assets/file.png',
    });
    expect(put).toHaveBeenCalledWith('assets/file.png', file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'image/png',
      token: 'blob-token',
    });
  });

  it('rejects files larger than the configured 4MB limit', async () => {
    const adapter = new StorageAdapter(config as never);
    const file = { size: MAX_FILE_SIZE + 1 } as Blob;

    await expect(
      adapter.upload({ pathname: 'large.bin', file }),
    ).rejects.toMatchObject({
      code: 'FILE_TOO_LARGE',
    } satisfies Partial<StorageError>);
    expect(put).not.toHaveBeenCalled();
  });

  it('maps provider upload and deletion failures', async () => {
    vi.mocked(put).mockRejectedValue(new Error('upload failed'));
    vi.mocked(del).mockRejectedValue(new Error('delete failed'));
    const adapter = new StorageAdapter(config as never);
    const file = new Blob(['file']);

    await expect(
      adapter.upload({ pathname: 'file.txt', file }),
    ).rejects.toMatchObject({ code: 'UPLOAD_FAILED' });
    await expect(adapter.delete('file.txt')).rejects.toMatchObject({
      code: 'DELETION_FAILED',
    });
  });

  it('treats a missing blob as already deleted', async () => {
    const { BlobNotFoundError } = await import('@vercel/blob');
    vi.mocked(del).mockRejectedValue(new BlobNotFoundError());
    const adapter = new StorageAdapter(config as never);

    await expect(adapter.delete('missing.txt')).resolves.toBeUndefined();
  });

  it.each([
    ['https://already.example/file.png', 'https://already.example/file.png'],
    ['nested/file.png', 'https://blob.example.com/nested/file.png'],
    ['/nested/file.png', 'https://blob.example.com/nested/file.png'],
  ])('normalizes public URL %s', (pathname, expected) => {
    const adapter = new StorageAdapter(config as never);

    expect(adapter.getPublicUrl(pathname)).toBe(expected);
  });
});
