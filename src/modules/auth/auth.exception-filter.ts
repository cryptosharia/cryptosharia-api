import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AuthError, type AuthErrorCode } from './auth.error';

const STATUS_CODES = {
  OTP_INVALID_OR_EXPIRED: HttpStatus.BAD_REQUEST,
  OTP_MAX_ATTEMPTS_EXCEEDED: HttpStatus.TOO_MANY_REQUESTS,
  OTP_REQUEST_RATE_LIMITED: HttpStatus.TOO_MANY_REQUESTS,
  REFRESH_TOKEN_INVALID: HttpStatus.UNAUTHORIZED,
  USER_INACTIVE: HttpStatus.FORBIDDEN,
} as const satisfies Record<AuthErrorCode, number>;

@Catch(AuthError)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(exception: AuthError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    if (exception.retryAfterSeconds !== undefined) {
      response.header('Retry-After', String(exception.retryAfterSeconds));
    }
    return response.status(STATUS_CODES[exception.code]).send({
      error: exception.code,
      message: exception.message,
      ...(exception.details ? { details: exception.details } : {}),
    });
  }
}
