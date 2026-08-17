import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { createErrorResponse } from '#src/common/create-error-response';
import { createResponsesConfig } from '#src/common/create-responses-config';
import {
  APP_ERRORS,
  ForbiddenResponse,
  UnauthorizedResponse,
  ValidationFailedResponse,
} from '#src/common/error-response.schemas';
import { AUTH_ERRORS } from './auth.error';
import {
  ForgotPasswordBody,
  RefreshBody,
  ResetPasswordBody,
  SessionResponse,
  SigninBody,
  SignoutBody,
  SignupBody,
  VerifyBody,
} from './auth.schemas';
import { UserResponse } from '#src/modules/users/users.schemas';

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
    path: '/auth/signup',
    summary: 'Signup',
    description:
      'Membuat akun baru (belum terverifikasi) dan kirim email verifikasi ke redirectUrl.',
    security: apiKeySecurity,
    request: {
      body: { content: { 'application/json': { schema: SignupBody } } },
    },
    responses: createResponsesConfig({
      201: {
        description: 'Akun dibuat & email verifikasi terkirim',
        body: UserResponse,
      },
      422: validationError,
      401: authErrors[401],
      409: {
        description: AUTH_ERRORS.EMAIL_ALREADY_REGISTERED,
        body: createErrorResponse(AUTH_ERRORS, ['EMAIL_ALREADY_REGISTERED']),
      },
    }),
  },
  {
    method: 'post',
    path: '/auth/verify',
    summary: 'Verifikasi email',
    description: 'Verifikasi email pakai token sekali pakai.',
    security: apiKeySecurity,
    request: {
      body: { content: { 'application/json': { schema: VerifyBody } } },
    },
    responses: createResponsesConfig({
      204: { description: 'Email terverifikasi' },
      422: validationError,
      401: authErrors[401],
      404: {
        description: AUTH_ERRORS.VERIFICATION_TOKEN_INVALID,
        body: createErrorResponse(AUTH_ERRORS, ['VERIFICATION_TOKEN_INVALID']),
      },
    }),
  },
  {
    method: 'post',
    path: '/auth/signin',
    summary: 'Signin',
    description:
      'Autentikasi dengan email & password, lalu dapat access token dan refresh token.',
    security: apiKeySecurity,
    request: {
      body: { content: { 'application/json': { schema: SigninBody } } },
    },
    responses: createResponsesConfig({
      200: { description: 'Signin berhasil', body: SessionResponse },
      422: validationError,
      401: {
        description: AUTH_ERRORS.INVALID_CREDENTIALS,
        body: createErrorResponse(AUTH_ERRORS, ['INVALID_CREDENTIALS']),
      },
      403: {
        description: AUTH_ERRORS.USER_INACTIVE,
        body: createErrorResponse(AUTH_ERRORS, ['USER_INACTIVE']),
      },
    }),
  },
  {
    method: 'post',
    path: '/auth/refresh',
    summary: 'Refresh token',
    description:
      'Cabut refresh token lama dan terbitkan access token + refresh token baru.',
    security: apiKeySecurity,
    request: {
      body: { content: { 'application/json': { schema: RefreshBody } } },
    },
    responses: createResponsesConfig({
      200: { description: 'Refresh token berhasil', body: SessionResponse },
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
    description: 'Cabut refresh token. Request yang diulang tetap sukses.',
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
    method: 'get',
    path: '/auth/me',
    summary: 'User saat ini',
    description: 'Mengembalikan profil user yang sedang login.',
    security: fullSecurity,
    responses: createResponsesConfig({
      200: { description: 'User saat ini', body: UserResponse },
      ...authErrors,
    }),
  },
  {
    method: 'post',
    path: '/auth/password/forgot',
    summary: 'Lupa password',
    description:
      'Kirim email reset password jika akun ada, tapi responsnya selalu sama.',
    security: apiKeySecurity,
    request: {
      body: { content: { 'application/json': { schema: ForgotPasswordBody } } },
    },
    responses: createResponsesConfig({
      204: { description: 'Email reset password terkirim' },
      422: validationError,
      401: authErrors[401],
    }),
  },
  {
    method: 'post',
    path: '/auth/password/reset',
    summary: 'Reset password',
    description:
      'Pakai token reset sekali pakai untuk ganti password dan cabut sesi refresh aktif.',
    security: apiKeySecurity,
    request: {
      body: { content: { 'application/json': { schema: ResetPasswordBody } } },
    },
    responses: createResponsesConfig({
      204: { description: 'Password berhasil direset' },
      422: validationError,
      401: authErrors[401],
      404: {
        description: AUTH_ERRORS.PASSWORD_RESET_TOKEN_INVALID,
        body: createErrorResponse(AUTH_ERRORS, [
          'PASSWORD_RESET_TOKEN_INVALID',
        ]),
      },
    }),
  },
];
