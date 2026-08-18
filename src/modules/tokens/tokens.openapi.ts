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
import { TOKENS_ERRORS } from './tokens.error';
import {
  TokenCreateBody,
  TokenDetail,
  TokenIdParam,
  TokenListItem,
  TokenParam,
  TokenQuoteQuery,
  TokensQuery,
  TokenUpdateBody,
} from './tokens.schemas';

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

export const tokensRouteConfig: RouteConfig[] = [
  {
    method: 'get',
    path: '/tokens',
    summary: 'List cryptoasset',
    description:
      'Menampilkan cryptoasset dengan filter status, status syariah, slug, tag, dan pagination.<br>Akun tanpa izin akses hanya cryptoasset berstatus `published` yang ditampilkan.<br>Gunakan `quote=true` untuk menyertakan data pasar.',
    security: publicReadSecurity,
    request: { query: TokensQuery },
    responses: createResponsesConfig({
      200: {
        description: 'Token berhasil ditampilkan',
        body: z.array(TokenListItem),
        headers: { 'total-items': z.string() },
      },
      ...commonValidationError,
      403: { description: APP_ERRORS.FORBIDDEN, body: ForbiddenResponse },
    }),
  },
  {
    method: 'post',
    path: '/tokens',
    summary: 'Buat cryptoasset',
    description: 'Membuat cryptoasset baru.',
    security: protectedSecurity,
    request: {
      body: { content: { 'application/json': { schema: TokenCreateBody } } },
    },
    responses: createResponsesConfig({
      201: { description: 'Token dibuat', body: TokenDetail },
      ...commonValidationError,
      403: { description: APP_ERRORS.FORBIDDEN, body: ForbiddenResponse },
      409: {
        description: 'Slug atau ticker cryptoasset sudah ada',
        body: createErrorResponse(TOKENS_ERRORS, [
          'SLUG_CONFLICT',
          'TICKER_CONFLICT',
        ]),
      },
    }),
  },
  {
    method: 'get',
    path: '/tokens/{identifier}',
    summary: 'Detail cryptoasset',
    description:
      'Ambil cryptoasset berdasarkan ID atau slug.<br>Cryptoasset non-published hanya dapat diakses dengan akun yang punya izin akses.<br>Gunakan quote=true untuk menyertakan data pasar.',
    security: publicReadSecurity,
    request: {
      params: TokenParam,
      query: TokenQuoteQuery,
    },
    responses: createResponsesConfig({
      200: { description: 'Token ditemukan', body: TokenDetail },
      ...commonValidationError,
      404: {
        description: TOKENS_ERRORS.TOKEN_NOT_FOUND,
        body: createErrorResponse(TOKENS_ERRORS, ['TOKEN_NOT_FOUND']),
      },
    }),
  },
  {
    method: 'patch',
    path: '/tokens/{id}',
    summary: 'Edit cryptoasset',
    description:
      'Edit cryptoasset berdasarkan ID.<br>Ketika tags disertakan, seluruh tag di-replace.',
    security: protectedSecurity,
    request: {
      params: TokenIdParam,
      body: { content: { 'application/json': { schema: TokenUpdateBody } } },
    },
    responses: createResponsesConfig({
      200: { description: 'Token diubah', body: TokenDetail },
      ...commonValidationError,
      403: { description: APP_ERRORS.FORBIDDEN, body: ForbiddenResponse },
      404: {
        description: TOKENS_ERRORS.TOKEN_NOT_FOUND,
        body: createErrorResponse(TOKENS_ERRORS, ['TOKEN_NOT_FOUND']),
      },
      409: {
        description: 'Slug atau ticker cryptoasset sudah ada',
        body: createErrorResponse(TOKENS_ERRORS, [
          'SLUG_CONFLICT',
          'TICKER_CONFLICT',
        ]),
      },
    }),
  },
  {
    method: 'delete',
    path: '/tokens/{id}',
    summary: 'Hapus cryptoasset',
    description: 'Hapus cryptoasset berdasarkan ID.',
    security: protectedSecurity,
    request: { params: TokenIdParam },
    responses: createResponsesConfig({
      204: { description: 'Token dihapus' },
      401: { description: APP_ERRORS.UNAUTHORIZED, body: UnauthorizedResponse },
      403: { description: APP_ERRORS.FORBIDDEN, body: ForbiddenResponse },
      404: {
        description: TOKENS_ERRORS.TOKEN_NOT_FOUND,
        body: createErrorResponse(TOKENS_ERRORS, ['TOKEN_NOT_FOUND']),
      },
    }),
  },
];
