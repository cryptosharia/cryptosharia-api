import { describe, expect, it, vi } from 'vitest';
import { MAX_IMAGE_SIZE } from './image-provider.constants';
import { ImageProviderAdapter } from './image-provider.adapter';

describe('ImageProviderAdapter', () => {
  const config = {
    getOrThrow: vi.fn().mockReturnValue('imgbb-key'),
  };

  it('uploads an image and maps the ImgBB response', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: 'image-id',
            title: 'cover',
            url: 'https://i.ibb.co/cover.png',
            width: 1200,
            height: 800,
            size: 12345,
            image: { filename: 'cover.png', mime: 'image/png' },
            delete_url: 'https://ibb.co/delete/image-id',
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const adapter = new ImageProviderAdapter(config as never);
    const file = new Blob(['image'], { type: 'image/png' });

    await expect(
      adapter.upload({ file, filename: 'cover.png', contentType: 'image/png' }),
    ).resolves.toEqual({
      providerId: 'image-id',
      title: 'cover',
      url: 'https://i.ibb.co/cover.png',
      width: 1200,
      height: 800,
      size: 12345,
      filename: 'cover.png',
      mimeType: 'image/png',
      deleteUrl: 'https://ibb.co/delete/image-id',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    fetchMock.mockRestore();
  });

  it('rejects non-image files and files over 32MB before network access', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const adapter = new ImageProviderAdapter(config as never);

    await expect(
      adapter.upload({
        file: new Blob(['file'], { type: 'text/plain' }),
        filename: 'file.txt',
        contentType: 'text/plain',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_FILE' });
    await expect(
      adapter.upload({
        file: { size: MAX_IMAGE_SIZE + 1 } as Blob,
        filename: 'large.png',
        contentType: 'image/png',
      }),
    ).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' });
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('maps network, provider, and malformed response failures', async () => {
    const adapter = new ImageProviderAdapter(config as never);
    const file = new Blob(['image'], { type: 'image/png' });
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    fetchMock.mockRejectedValueOnce(new Error('network'));
    await expect(
      adapter.upload({ file, filename: 'image.png', contentType: 'image/png' }),
    ).rejects.toMatchObject({ code: 'UPLOAD_FAILED' });

    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 502 }));
    await expect(
      adapter.upload({ file, filename: 'image.png', contentType: 'image/png' }),
    ).rejects.toMatchObject({ code: 'UPLOAD_FAILED' });

    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await expect(
      adapter.upload({ file, filename: 'image.png', contentType: 'image/png' }),
    ).rejects.toMatchObject({ code: 'UPLOAD_FAILED' });
    fetchMock.mockRestore();
  });
});
