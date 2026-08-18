import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Asset, User } from '#src/modules/drizzle/drizzle.types';
import { AuditService } from '#src/modules/audit/audit.service';
import { ImageProviderError } from '#src/modules/image-provider/image-provider.error';
import { ImageProviderService } from '#src/modules/image-provider/image-provider.service';
import { StorageError } from '#src/modules/storage/storage.error';
import { StorageService } from '#src/modules/storage/storage.service';
import type {
  AssetCleanupOptions,
  AssetCleanupResult,
  AssetMetadata,
  AssetResponse,
  ImgbbImageResponse,
  UploadFile,
} from './assets.schemas';
import { AssetsError } from './assets.error';
import { createAssetPathname, getImageDimensions } from './assets.helpers';
import { AssetsRepository } from './assets.repository';

type UploadInput = Pick<UploadFile, 'filename' | 'contentType' | 'buffer'>;

function toBlob(buffer: Buffer, contentType: string): Blob {
  const bytes = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
  return new Blob([bytes], { type: contentType });
}

@Injectable()
export class AssetsService {
  constructor(
    private readonly assetsRepository: AssetsRepository,
    private readonly storageService: StorageService,
    private readonly imageProviderService: ImageProviderService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async uploadAsset(
    userId: User['id'],
    input: UploadInput,
  ): Promise<AssetResponse> {
    const pathname = createAssetPathname(
      input.filename,
      this.configService.get<string>('NODE_ENV') === 'production',
    );
    const { width, height } = getImageDimensions(
      input.buffer,
      input.contentType,
    );
    const file = toBlob(input.buffer, input.contentType);

    let uploaded: { pathname: string };
    try {
      uploaded = await this.storageService.upload({
        pathname,
        file,
        contentType: input.contentType || undefined,
      });
    } catch (error) {
      if (error instanceof StorageError) {
        throw new AssetsError('STORAGE_UPLOAD_FAILED');
      }
      throw error;
    }

    try {
      const asset = await this.assetsRepository.insertAsset({
        pathname: uploaded.pathname,
        filename: input.filename,
        size: input.buffer.length,
        mimeType: input.contentType || null,
        width,
        height,
        provider: 'vercel_blob',
        createdBy: userId,
      });
      await this.auditService.log({
        userId,
        action: 'asset.upload',
        subjectType: 'asset',
        subjectId: asset.id,
        description: `Upload aset: ${asset.filename}`,
      });

      return asset;
    } catch (error) {
      try {
        // Do not leave an externally stored object when its database metadata was not saved.
        await this.storageService.delete(uploaded.pathname);
      } catch {
        // Surface the original persistence failure; rollback is best-effort.
      }
      throw error;
    }
  }

  async uploadImgbbImage(
    userId: User['id'],
    input: UploadInput,
  ): Promise<ImgbbImageResponse> {
    try {
      const providerImage = await this.imageProviderService.upload({
        file: toBlob(input.buffer, input.contentType),
        filename: input.filename,
        contentType: input.contentType,
      });
      const image = await this.assetsRepository.upsertImgbbImage({
        imgbbId: providerImage.providerId,
        title: providerImage.title,
        url: providerImage.url,
        width: providerImage.width,
        height: providerImage.height,
        size: providerImage.size,
        fileName: providerImage.filename,
        mimeType: providerImage.mimeType,
        deleteUrl: providerImage.deleteUrl,
        createdBy: userId,
      });
      await this.auditService.log({
        userId,
        action: 'imgbb.upload',
        subjectType: 'imgbb_image',
        subjectId: image.id,
        description: `Upload gambar: ${image.fileName}`,
      });

      return image;
    } catch (error) {
      if (error instanceof ImageProviderError) {
        throw new AssetsError('IMAGE_UPLOAD_FAILED');
      }
      throw error;
    }
  }

  async cleanup(input: AssetCleanupOptions): Promise<AssetCleanupResult> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - input.maxAgeDays);
    const candidates = await this.assetsRepository.selectCleanupCandidates({
      cutoff,
      limit: input.limit,
    });
    if (input.dryRun) {
      return {
        dryRun: true,
        candidates: candidates.length,
        deleted: 0,
        failed: 0,
        failures: [],
      };
    }

    let deleted = 0;
    const failures: AssetCleanupResult['failures'] = [];
    for (const candidate of candidates) {
      try {
        await this.storageService.delete(candidate.pathname);
        await this.assetsRepository.deleteAsset(candidate.id);
        deleted += 1;
      } catch (error) {
        failures.push({
          assetId: candidate.id,
          pathname: candidate.pathname,
          reason:
            error instanceof Error ? error.message : 'Unknown cleanup error',
        });
      }
    }

    return {
      dryRun: false,
      candidates: candidates.length,
      deleted,
      failed: failures.length,
      failures,
    };
  }

  toAssetMetadata(asset: Asset | null | undefined): AssetMetadata | null {
    if (!asset) return null;
    return {
      id: asset.id,
      url: this.resolveAssetUrl(asset),
      filename: asset.filename,
      size: asset.size,
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
    };
  }

  private resolveAssetUrl(asset: Asset): string {
    if (asset.pathname.startsWith('http')) return asset.pathname;
    if (asset.provider === 'picsum') {
      return `https://picsum.photos/${asset.pathname.replace(/^\/+/, '')}`;
    }
    return this.storageService.getPublicUrl(asset.pathname);
  }
}
