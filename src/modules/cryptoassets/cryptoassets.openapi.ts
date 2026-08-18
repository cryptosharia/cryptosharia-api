import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { createErrorResponse } from '#src/common/create-error-response';
import { createResponsesConfig } from '#src/common/create-responses-config';
import {
  APP_ERRORS,
  ForbiddenResponse,
  UnauthorizedResponse,
  ValidationFailedResponse,
} from '#src/common/error-response.schemas';
import { CRYPTOASSETS_ERRORS } from './cryptoassets.error';
import {
  CryptoassetCreateBody,
  CryptoassetDetail,
  CryptoassetIdParam,
  CryptoassetListItem,
  CryptoassetParam,
  CryptoassetQuoteQuery,
  CryptoassetsQuery,
  CryptoassetUpdateBody,
} from './cryptoassets.schemas';

const publicReadSecurity: { [key: string]: string[] }[] = [{ ApiKeyAuth: [] }];
const protectedSecurity: { [key: string]: string[] }[] = [
  { ApiKeyAuth: [], BearerAuth: [] },
];

const commonValidationError = {
  422: {
    description: APP_ERRORS.VALIDATION_FAILED,
    body: ValidationFailedResponse,
  },
  401: { description: APP_ERRORS.UNAUTHORIZED, body: UnauthorizedResponse },
};

export const cryptoassetsRouteConfig: RouteConfig[] = [
  {
    method: 'get',
    path: '/cryptoassets',
    summary: 'List cryptoasset',
    description:
      'Menampilkan cryptoasset dengan filter status, status syariah, slug, tag, dan pagination.<br>Akun tanpa izin akses hanya cryptoasset berstatus `published` yang ditampilkan.<br>Gunakan `quote=true` untuk menyertakan data pasar.',
    security: publicReadSecurity,
    request: { query: CryptoassetsQuery },
    responses: createResponsesConfig({
      200: {
        description: 'Cryptoasset berhasil ditampilkan',
        body: z.array(CryptoassetListItem),
        headers: { 'total-items': z.string() },
      },
      ...commonValidationError,
      403: { description: APP_ERRORS.FORBIDDEN, body: ForbiddenResponse },
    }),
  },
  {
    method: 'post',
    path: '/cryptoassets',
    summary: 'Buat cryptoasset',
    description: 'Membuat cryptoasset baru.',
    security: protectedSecurity,
    request: {
      body: {
        content: { 'application/json': { schema: CryptoassetCreateBody } },
      },
    },
    responses: createResponsesConfig({
      201: { description: 'Cryptoasset dibuat', body: CryptoassetDetail },
      ...commonValidationError,
      403: { description: APP_ERRORS.FORBIDDEN, body: ForbiddenResponse },
      409: {
        description: 'Slug atau ticker cryptoasset sudah ada',
        body: createErrorResponse(CRYPTOASSETS_ERRORS, [
          'SLUG_CONFLICT',
          'TICKER_CONFLICT',
        ]),
      },
    }),
  },
  {
    method: 'get',
    path: '/cryptoassets/{identifier}',
    summary: 'Detail cryptoasset',
    description:
      'Ambil cryptoasset berdasarkan ID atau slug.<br>Cryptoasset non-published hanya dapat diakses dengan akun yang punya izin akses.<br>Gunakan quote=true untuk menyertakan data pasar.',
    security: publicReadSecurity,
    request: {
      params: CryptoassetParam,
      query: CryptoassetQuoteQuery,
    },
    responses: createResponsesConfig({
      200: { description: 'Cryptoasset ditemukan', body: CryptoassetDetail },
      ...commonValidationError,
      404: {
        description: CRYPTOASSETS_ERRORS.CRYPTOASSET_NOT_FOUND,
        body: createErrorResponse(CRYPTOASSETS_ERRORS, [
          'CRYPTOASSET_NOT_FOUND',
        ]),
      },
    }),
  },
  {
    method: 'patch',
    path: '/cryptoassets/{id}',
    summary: 'Edit cryptoasset',
    description:
      'Edit cryptoasset berdasarkan ID.<br>Ketika tags disertakan, seluruh tag di-replace.',
    security: protectedSecurity,
    request: {
      params: CryptoassetIdParam,
      body: {
        content: { 'application/json': { schema: CryptoassetUpdateBody } },
      },
    },
    responses: createResponsesConfig({
      200: { description: 'Cryptoasset diubah', body: CryptoassetDetail },
      ...commonValidationError,
      403: { description: APP_ERRORS.FORBIDDEN, body: ForbiddenResponse },
      404: {
        description: CRYPTOASSETS_ERRORS.CRYPTOASSET_NOT_FOUND,
        body: createErrorResponse(CRYPTOASSETS_ERRORS, [
          'CRYPTOASSET_NOT_FOUND',
        ]),
      },
      409: {
        description: 'Slug atau ticker cryptoasset sudah ada',
        body: createErrorResponse(CRYPTOASSETS_ERRORS, [
          'SLUG_CONFLICT',
          'TICKER_CONFLICT',
        ]),
      },
    }),
  },
  {
    method: 'delete',
    path: '/cryptoassets/{id}',
    summary: 'Hapus cryptoasset',
    description: 'Hapus cryptoasset berdasarkan ID.',
    security: protectedSecurity,
    request: { params: CryptoassetIdParam },
    responses: createResponsesConfig({
      204: { description: 'Cryptoasset dihapus' },
      401: { description: APP_ERRORS.UNAUTHORIZED, body: UnauthorizedResponse },
      403: { description: APP_ERRORS.FORBIDDEN, body: ForbiddenResponse },
      404: {
        description: CRYPTOASSETS_ERRORS.CRYPTOASSET_NOT_FOUND,
        body: createErrorResponse(CRYPTOASSETS_ERRORS, [
          'CRYPTOASSET_NOT_FOUND',
        ]),
      },
    }),
  },
];
