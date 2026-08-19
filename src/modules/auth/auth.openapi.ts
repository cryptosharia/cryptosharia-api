import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { createErrorResponse } from '#src/common/create-error-response';
import { createResponsesConfig } from '#src/common/create-responses-config';
import {
  APP_ERRORS,
  ForbiddenResponse,
  UnauthorizedResponse,
  ValidationFailedResponse,
} from '#src/common/error-response.schemas';
import { UserResponse } from '#src/modules/users/users.schemas';
import { AUTH_ERRORS } from './auth.error';
import {
  OtpInvalidDetails,
  OtpRequestBody,
  OtpVerifyBody,
  RefreshBody,
  RefreshResponse,
  RetryAfterHeader,
  SessionResponse,
  SignoutBody,
} from './auth.schemas';

const apiKeySecurity: { [key: string]: string[] }[] = [{ ApiKeyAuth: [] }];
const fullSecurity: { [key: string]: string[] }[] = [
  { ApiKeyAuth: [], BearerAuth: [] },
];
const validationError = {
  description: APP_ERRORS.VALIDATION_FAILED,
  body: ValidationFailedResponse,
};
const authErrors = {
  401: { description: APP_ERRORS.UNAUTHORIZED, body: UnauthorizedResponse },
  403: { description: APP_ERRORS.FORBIDDEN, body: ForbiddenResponse },
};

export const authRouteConfig: RouteConfig[] = [
  {
    method: 'post',
    path: '/auth/otp/request',
    summary: 'Request kode OTP',
    description:
      'Kirim kode OTP 6 digit ke email. Response selalu sama untuk email terdaftar maupun tidak.',
    security: apiKeySecurity,
    request: {
      body: { content: { 'application/json': { schema: OtpRequestBody } } },
    },
    responses: createResponsesConfig({
      204: { description: 'Kode OTP terkirim' },
      422: validationError,
      401: authErrors[401],
      429: {
        description: AUTH_ERRORS.OTP_REQUEST_RATE_LIMITED,
        body: createErrorResponse(AUTH_ERRORS, ['OTP_REQUEST_RATE_LIMITED']),
        headers: {
          'Retry-After': RetryAfterHeader,
        },
      },
    }),
  },
  {
    method: 'post',
    path: '/auth/otp/verify',
    summary: 'Verifikasi kode OTP',
    description:
      'Verifikasi kode OTP dan buat sesi. User baru dibuat otomatis saat email belum terdaftar.',
    security: apiKeySecurity,
    request: {
      body: { content: { 'application/json': { schema: OtpVerifyBody } } },
    },
    responses: createResponsesConfig({
      200: { description: 'Verifikasi berhasil', body: SessionResponse },
      422: validationError,
      401: authErrors[401],
      400: {
        description: AUTH_ERRORS.OTP_INVALID_OR_EXPIRED,
        body: createErrorResponse(
          AUTH_ERRORS,
          ['OTP_INVALID_OR_EXPIRED'],
          OtpInvalidDetails.shape,
        ),
      },
      429: {
        description: AUTH_ERRORS.OTP_MAX_ATTEMPTS_EXCEEDED,
        body: createErrorResponse(AUTH_ERRORS, ['OTP_MAX_ATTEMPTS_EXCEEDED']),
      },
    }),
  },
  {
    method: 'post',
    path: '/auth/refresh',
    summary: 'Perbarui access token',
    description: 'Terbitkan access token baru.',
    security: apiKeySecurity,
    request: {
      body: { content: { 'application/json': { schema: RefreshBody } } },
    },
    responses: createResponsesConfig({
      200: { description: 'Access token baru', body: RefreshResponse },
      422: validationError,
      401: {
        description: AUTH_ERRORS.REFRESH_TOKEN_INVALID,
        body: createErrorResponse(AUTH_ERRORS, ['REFRESH_TOKEN_INVALID']),
      },
      403: {
        description: AUTH_ERRORS.USER_INACTIVE,
        body: createErrorResponse(AUTH_ERRORS, ['USER_INACTIVE']),
      },
    }),
  },
  {
    method: 'post',
    path: '/auth/signout',
    summary: 'Signout',
    description:
      'Cabut sesi untuk refresh token ini. Request yang diulang tetap sukses.',
    security: apiKeySecurity,
    request: {
      body: { content: { 'application/json': { schema: SignoutBody } } },
    },
    responses: createResponsesConfig({
      204: { description: 'Signout berhasil' },
      422: validationError,
      401: authErrors[401],
    }),
  },
  {
    method: 'post',
    path: '/auth/signout-all',
    summary: 'Signout semua sesi',
    description: 'Mencabut semua sesi aktif user yang sedang signin.',
    security: fullSecurity,
    responses: createResponsesConfig({
      204: { description: 'Semua sesi dicabut' },
      ...authErrors,
    }),
  },
  {
    method: 'get',
    path: '/auth/me',
    summary: 'User saat ini',
    description: 'Mengembalikan profil user yang sedang signin.',
    security: fullSecurity,
    responses: createResponsesConfig({
      200: { description: 'User saat ini', body: UserResponse },
      ...authErrors,
    }),
  },
];
