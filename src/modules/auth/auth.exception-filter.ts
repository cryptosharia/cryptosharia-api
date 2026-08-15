import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AuthError, type AuthErrorCode } from './auth.error';

const STATUS_CODES = {
  EMAIL_ALREADY_REGISTERED: HttpStatus.CONFLICT,
  INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
  USER_INACTIVE: HttpStatus.FORBIDDEN,
  VERIFICATION_TOKEN_INVALID: HttpStatus.NOT_FOUND,
  PASSWORD_RESET_TOKEN_INVALID: HttpStatus.NOT_FOUND,
  REFRESH_TOKEN_INVALID: HttpStatus.UNAUTHORIZED,
} as const satisfies Record<AuthErrorCode, number>;

@Catch(AuthError)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(exception: AuthError, host: ArgumentsHost) {
    return host
      .switchToHttp()
      .getResponse<FastifyReply>()
      .status(STATUS_CODES[exception.code])
      .send({ error: exception.code, message: exception.message });
  }
}
