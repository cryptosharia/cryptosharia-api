import { ConfigService } from '@nestjs/config';
import { Asset, ImgbbImage, User } from '#src/modules/drizzle/drizzle.types';
import { AuditService } from '#src/modules/audit/audit.service';
import { ImageProviderError } from '#src/modules/image-provider/image-provider.error';
import { ImageProviderService } from '#src/modules/image-provider/image-provider.service';
import { StorageError } from '#src/modules/storage/storage.error';
import { StorageService } from '#src/modules/storage/storage.service';
import { AssetsError } from './assets.error';
import { AssetsRepository } from './assets.repository';
import { AssetsService } from './assets.service';

type UploadInput = {
  pathname: string;
  file: Blob;
  contentType?: string;
};

class MockAssetsRepository {
  insertAsset = vi.fn();
  upsertImgbbImage = vi.fn();
  selectCleanupCandidates = vi.fn();
  deleteAsset = vi.fn();
}

class MockStorageService {
  upload =
    vi.fn<(input: UploadInput) => Promise<{ url: string; pathname: string }>>();
  delete = vi.fn<(pathnameOrUrl: string) => Promise<void>>();
  getPublicUrl = vi.fn<(pathname: string) => string>();
}

class MockImageProviderService {
  upload = vi.fn();
}

class MockAuditService {
  log = vi.fn();
}

const mockUser: User = {
  id: '0d53e95e-9ac5-41e1-b8d7-9c7f2a3b4c5d',
  name: 'Test User',
  email: 'test@example.com',
  hashedPassword: 'hash',
  passwordHashingAlgorithm: 'argon2id',
  role: 'posts_manager',
  status: 'active',
  avatarId: null,
  twoFactorSecret: null,
  lastLoginAt: null,
  isEmailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  updatedBy: null,
};

const mockAsset: Asset = {
  id: '0d53e95e-9ac5-41e1-b8d7-9c7f2a3b4c5e',
  pathname: 'temp/assets/uuid-file.txt',
  filename: 'file.txt',
  size: 5,
  mimeType: 'text/plain',
  width: null,
  height: null,
  provider: 'vercel_blob',
  createdAt: new Date(),
  createdBy: mockUser.id,
};

const mockImgbbImage: ImgbbImage = {
  id: '0d53e95e-9ac5-41e1-b8d7-9c7f2a3b4c5f',
  imgbbId: 'imgbb-id',
  title: 'cover',
  url: 'https://i.ibb.co/cover.png',
  width: 1200,
  height: 800,
  size: 12345,
  fileName: 'cover.png',
  mimeType: 'image/png',
  deleteUrl: 'https://ibb.co/delete/imgbb-id',
  createdAt: new Date(),
  createdBy: mockUser.id,
};

describe('AssetsService', () => {
  let assetsRepository: MockAssetsRepository;
  let storageService: MockStorageService;
  let imageProviderService: MockImageProviderService;
  let auditService: MockAuditService;
  let configService: { get: ReturnType<typeof vi.fn> };
  let assetsService: AssetsService;

  const uploadInput = {
    filename: 'file.txt',
    contentType: 'text/plain',
    buffer: Buffer.from('hello'),
  };

  beforeEach(() => {
    assetsRepository = new MockAssetsRepository();
    storageService = new MockStorageService();
    imageProviderService = new MockImageProviderService();
    auditService = new MockAuditService();
    configService = { get: vi.fn().mockReturnValue('test') };
    assetsService = new AssetsService(
      assetsRepository as unknown as AssetsRepository,
      storageService as unknown as StorageService,
      imageProviderService as unknown as ImageProviderService,
      auditService as unknown as AuditService,
      configService as unknown as ConfigService,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadAsset', () => {
    it('uploads the file and persists metadata', async () => {
      storageService.upload.mockResolvedValue({
        url: 'https://blob.example.com/temp/assets/uuid-file.txt',
        pathname: mockAsset.pathname,
      });
      assetsRepository.insertAsset.mockResolvedValue(mockAsset);

      const result = await assetsService.uploadAsset(mockUser.id, uploadInput);

      expect(result).toEqual(mockAsset);
      const uploadCall = storageService.upload.mock.calls[0][0];
      expect(uploadCall.pathname).toContain('temp/assets/');
      expect(uploadCall.file).toBeInstanceOf(Blob);
      expect(uploadCall.contentType).toBe('text/plain');
      expect(assetsRepository.insertAsset).toHaveBeenCalledWith({
        pathname: mockAsset.pathname,
        filename: uploadInput.filename,
        size: 5,
        mimeType: 'text/plain',
        width: null,
        height: null,
        provider: 'vercel_blob',
        createdBy: mockUser.id,
      });
      expect(auditService.log).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: 'asset.upload',
        subjectType: 'asset',
        subjectId: mockAsset.id,
        description: 'Upload aset: file.txt',
      });
    });

    it('uses the assets prefix when running in production', async () => {
      configService.get.mockReturnValue('production');
      storageService.upload.mockResolvedValue({
        url: 'https://blob.example.com/assets/uuid-file.txt',
        pathname: 'assets/uuid-file.txt',
      });
      assetsRepository.insertAsset.mockResolvedValue(mockAsset);

      await assetsService.uploadAsset(mockUser.id, uploadInput);

      const uploadCall = storageService.upload.mock.calls[0][0];
      expect(uploadCall.pathname).toContain('assets/');
      expect(uploadCall.pathname).not.toContain('temp/');
    });

    it('maps storage failures to a provider error', async () => {
      storageService.upload.mockRejectedValue(
        new StorageError('UPLOAD_FAILED'),
      );

      await expect(
        assetsService.uploadAsset(mockUser.id, uploadInput),
      ).rejects.toBeInstanceOf(AssetsError);
    });

    it('deletes the uploaded blob when metadata persistence fails', async () => {
      storageService.upload.mockResolvedValue({
        url: 'https://blob.example.com/temp/assets/uuid-file.txt',
        pathname: mockAsset.pathname,
      });
      assetsRepository.insertAsset.mockRejectedValue(
        new Error('database down'),
      );

      await expect(
        assetsService.uploadAsset(mockUser.id, uploadInput),
      ).rejects.toThrow('database down');
      expect(storageService.delete).toHaveBeenCalledWith(mockAsset.pathname);
    });
  });

  describe('uploadImgbbImage', () => {
    const imgbbInput = {
      filename: 'cover.png',
      contentType: 'image/png',
      buffer: Buffer.from('image'),
    };

    it('uploads through the provider, upserts metadata, and logs activity', async () => {
      imageProviderService.upload.mockResolvedValue({
        providerId: mockImgbbImage.imgbbId,
        title: mockImgbbImage.title,
        url: mockImgbbImage.url,
        width: mockImgbbImage.width,
        height: mockImgbbImage.height,
        size: mockImgbbImage.size,
        filename: mockImgbbImage.fileName,
        mimeType: mockImgbbImage.mimeType,
        deleteUrl: mockImgbbImage.deleteUrl,
      });
      assetsRepository.upsertImgbbImage.mockResolvedValue(mockImgbbImage);

      const result = await assetsService.uploadImgbbImage(
        mockUser.id,
        imgbbInput,
      );

      expect(result).toEqual(mockImgbbImage);
      expect(assetsRepository.upsertImgbbImage).toHaveBeenCalledWith({
        imgbbId: mockImgbbImage.imgbbId,
        title: mockImgbbImage.title,
        url: mockImgbbImage.url,
        width: mockImgbbImage.width,
        height: mockImgbbImage.height,
        size: mockImgbbImage.size,
        fileName: mockImgbbImage.fileName,
        mimeType: mockImgbbImage.mimeType,
        deleteUrl: mockImgbbImage.deleteUrl,
        createdBy: mockUser.id,
      });
      expect(auditService.log).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: 'imgbb.upload',
        subjectType: 'imgbb_image',
        subjectId: mockImgbbImage.id,
        description: 'Upload gambar: cover.png',
      });
    });

    it('maps provider failures to a provider error', async () => {
      imageProviderService.upload.mockRejectedValue(
        new ImageProviderError('UPLOAD_FAILED'),
      );

      await expect(
        assetsService.uploadImgbbImage(mockUser.id, imgbbInput),
      ).rejects.toBeInstanceOf(AssetsError);
    });
  });

  describe('cleanup', () => {
    const candidates = [
      { id: 'asset-1', pathname: 'assets/orphan-1.png' },
      { id: 'asset-2', pathname: 'assets/orphan-2.png' },
    ];

    it('reports candidates without deleting anything on a dry run', async () => {
      assetsRepository.selectCleanupCandidates.mockResolvedValue(candidates);

      const result = await assetsService.cleanup({
        dryRun: true,
        limit: 100,
        maxAgeDays: 7,
      });

      expect(result).toEqual({
        dryRun: true,
        candidates: 2,
        deleted: 0,
        failed: 0,
        failures: [],
      });
      expect(storageService.delete).not.toHaveBeenCalled();
      expect(assetsRepository.deleteAsset).not.toHaveBeenCalled();
    });

    it('deletes the blob and database row for each candidate', async () => {
      assetsRepository.selectCleanupCandidates.mockResolvedValue(candidates);
      storageService.delete.mockResolvedValue(undefined);
      assetsRepository.deleteAsset.mockResolvedValue(undefined);

      const result = await assetsService.cleanup({
        dryRun: false,
        limit: 100,
        maxAgeDays: 7,
      });

      expect(result).toMatchObject({ deleted: 2, failed: 0 });
      expect(storageService.delete).toHaveBeenCalledWith(
        candidates[0].pathname,
      );
      expect(assetsRepository.deleteAsset).toHaveBeenCalledWith(
        candidates[0].id,
      );
    });

    it('records a failure and keeps the row when deletion fails', async () => {
      assetsRepository.selectCleanupCandidates.mockResolvedValue([
        candidates[0],
      ]);
      storageService.delete.mockRejectedValue(new Error('provider down'));

      const result = await assetsService.cleanup({
        dryRun: false,
        limit: 100,
        maxAgeDays: 7,
      });

      expect(result).toMatchObject({ deleted: 0, failed: 1 });
      expect(result.failures[0]).toMatchObject({
        assetId: candidates[0].id,
        pathname: candidates[0].pathname,
      });
      expect(assetsRepository.deleteAsset).not.toHaveBeenCalled();
    });
  });
});
