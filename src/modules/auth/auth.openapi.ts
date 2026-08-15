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
    summary: 'Sign up',
    description:
      'Creates an unverified user account and sends a verification email to the supplied redirect URL.',
    security: apiKeySecurity,
    request: {
      body: { content: { 'application/json': { schema: SignupBody } } },
    },
    responses: createResponsesConfig({
      201: {
        description: 'User registered & verification email sent',
        body: UserResponse,
      },
      400: validationError,
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
    summary: 'Verify email',
    description:
      'Consumes a one-time verification token and marks the associated email address as verified.',
    security: apiKeySecurity,
    request: {
      body: { content: { 'application/json': { schema: VerifyBody } } },
    },
    responses: createResponsesConfig({
      204: { description: 'Email verified' },
      400: validationError,
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
    summary: 'Sign in',
    description:
      'Authenticates an active verified user account and issues an access and refresh token pair.',
    security: apiKeySecurity,
    request: {
      body: { content: { 'application/json': { schema: SigninBody } } },
    },
    responses: createResponsesConfig({
      200: { description: 'Signed in', body: SessionResponse },
      400: validationError,
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
    summary: 'Refresh tokens',
    description:
      'Revokes the submitted refresh token and issues a replacement access and refresh token pair.',
    security: apiKeySecurity,
    request: {
      body: { content: { 'application/json': { schema: RefreshBody } } },
    },
    responses: createResponsesConfig({
      200: { description: 'Tokens refreshed', body: SessionResponse },
      400: validationError,
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
    summary: 'Sign out',
    description:
      'Revokes the submitted refresh token. Repeating the request remains successful.',
    security: apiKeySecurity,
    request: {
      body: { content: { 'application/json': { schema: SignoutBody } } },
    },
    responses: createResponsesConfig({
      204: { description: 'Signed out' },
      400: validationError,
      401: authErrors[401],
    }),
  },
  {
    method: 'get',
    path: '/auth/me',
    summary: 'Get current user',
    description: 'Returns the user profile for the bearer-authenticated user.',
    security: fullSecurity,
    responses: createResponsesConfig({
      200: { description: 'Current user', body: UserResponse },
      ...authErrors,
    }),
  },
  {
    method: 'post',
    path: '/auth/password/forgot',
    summary: 'Request password reset',
    description:
      'Sends a password reset email when the account exists while always returning the same response.',
    security: apiKeySecurity,
    request: {
      body: { content: { 'application/json': { schema: ForgotPasswordBody } } },
    },
    responses: createResponsesConfig({
      204: { description: 'Password reset email sent' },
      400: validationError,
      401: authErrors[401],
    }),
  },
  {
    method: 'post',
    path: '/auth/password/reset',
    summary: 'Reset password',
    description:
      'Consumes a one-time password reset token, updates the password, and revokes active refresh sessions.',
    security: apiKeySecurity,
    request: {
      body: { content: { 'application/json': { schema: ResetPasswordBody } } },
    },
    responses: createResponsesConfig({
      204: { description: 'Password reset' },
      400: validationError,
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
