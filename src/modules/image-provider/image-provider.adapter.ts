import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageProviderError } from './image-provider.error';
import { MAX_IMAGE_SIZE } from './image-provider.constants';

type ImgbbResponse = {
  data?: {
    id: string;
    title: string;
    url: string;
    width: number | string;
    height: number | string;
    size: number | string;
    image: { filename: string; mime: string };
    delete_url: string;
  };
};

@Injectable()
export class ImageProviderAdapter {
  private readonly apiKey: string;

  constructor(configService: ConfigService) {
    this.apiKey = configService.getOrThrow<string>('IMGBB_API_KEY');
  }

  async upload(input: {
    file: Blob;
    filename: string;
    contentType: string;
  }): Promise<{
    providerId: string;
    title: string;
    url: string;
    width: number;
    height: number;
    size: number;
    filename: string;
    mimeType: string;
    deleteUrl: string;
  }> {
    // ImgBB accepts arbitrary payloads; enforce this endpoint's image-only contract before upload.
    if (!input.contentType.startsWith('image/'))
      throw new ImageProviderError('INVALID_FILE');

    // Keep the API limit independent from changes to ImgBB's provider limit.
    if (input.file.size > MAX_IMAGE_SIZE)
      throw new ImageProviderError('FILE_TOO_LARGE');

    const formData = new FormData();
    formData.set('image', input.file, input.filename);
    formData.set('name', crypto.randomUUID());

    let response: Response;
    try {
      response = await fetch(
        `https://api.imgbb.com/1/upload?key=${encodeURIComponent(this.apiKey)}`,
        { method: 'POST', body: formData },
      );
    } catch {
      throw new ImageProviderError('UPLOAD_FAILED');
    }

    if (!response.ok) throw new ImageProviderError('UPLOAD_FAILED');

    try {
      const { data } = (await response.json()) as ImgbbResponse;
      if (!data) throw new ImageProviderError('UPLOAD_FAILED');

      // Normalize ImgBB's string-or-number fields before persisting application metadata.
      return {
        providerId: data.id,
        title: data.title,
        url: data.url,
        width: Number(data.width),
        height: Number(data.height),
        size: Number(data.size),
        filename: data.image.filename,
        mimeType: data.image.mime,
        deleteUrl: data.delete_url,
      };
    } catch (error) {
      if (error instanceof ImageProviderError) throw error;

      throw new ImageProviderError('UPLOAD_FAILED');
    }
  }
}
