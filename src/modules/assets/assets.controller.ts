import { Controller, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  CurrentUser,
  type CurrentUser as CurrentUserType,
} from '#src/modules/security/current-user.decorator';
import { AuthenticationGuard } from '#src/modules/security/authentication.guard';
import { PermissionGuard } from '#src/modules/security/permission.guard';
import { RequirePermissions } from '#src/modules/security/require-permissions.decorator';
import { MAX_IMAGE_SIZE } from '#src/modules/image-provider/image-provider.constants';
import { MAX_FILE_SIZE } from '#src/modules/storage/storage.constants';
import { AssetsExceptionFilter } from './assets.exception-filter';
import { AssetUpload, ImgbbUpload, type UploadFile } from './assets.schemas';
import { AssetsService } from './assets.service';

type UploadSchema = z.ZodType<{ file: UploadFile }>;
type MultipartPart = import('@fastify/multipart').MultipartFile;

async function readUploadedFile(
  request: FastifyRequest,
  maxFileSize: number,
  schema: UploadSchema,
): Promise<UploadFile> {
  let part: MultipartPart | undefined;
  try {
    // Let the normalized Zod schema produce the standard validation response for truncation.
    part = await request.file({
      limits: { fileSize: maxFileSize },
      throwFileSizeLimit: false,
    });
  } catch {
    return schema.parse({}).file;
  }

  if (!part) return schema.parse({}).file;

  let buffer: Buffer;
  try {
    buffer = await part.toBuffer();
  } catch {
    return schema.parse({}).file;
  }

  return schema.parse({
    file: {
      filename: part.filename || 'file',
      contentType: part.mimetype || 'application/octet-stream',
      size: part.file.truncated ? maxFileSize + 1 : buffer.length,
      buffer,
      truncated: part.file.truncated,
    },
  }).file;
}

@Controller()
@UseFilters(AssetsExceptionFilter)
@UseGuards(AuthenticationGuard, PermissionGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post('assets')
  @RequirePermissions('posts.manage', 'cryptoassets.manage')
  async uploadAsset(
    @CurrentUser() currentUser: CurrentUserType,
    @Req() request: FastifyRequest,
  ) {
    return this.assetsService.uploadAsset(
      currentUser.id,
      await readUploadedFile(request, MAX_FILE_SIZE, AssetUpload),
    );
  }

  @Post('imgbb')
  @RequirePermissions('posts.manage', 'cryptoassets.manage')
  async uploadImgbbImage(
    @CurrentUser() currentUser: CurrentUserType,
    @Req() request: FastifyRequest,
  ) {
    return this.assetsService.uploadImgbbImage(
      currentUser.id,
      await readUploadedFile(request, MAX_IMAGE_SIZE, ImgbbUpload),
    );
  }
}
