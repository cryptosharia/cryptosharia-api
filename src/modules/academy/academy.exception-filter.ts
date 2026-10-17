import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AcademyError, type AcademyErrorCode } from './academy.error';

const STATUS_CODES: Record<AcademyErrorCode, number> = {
  SCOPE_NOT_FOUND: HttpStatus.NOT_FOUND,
  CONTENT_NOT_FOUND: HttpStatus.NOT_FOUND,
  LESSON_NOT_PUBLISHED: HttpStatus.NOT_FOUND,
  MEDIA_NOT_FOUND: HttpStatus.NOT_FOUND,
  GRANT_NOT_FOUND: HttpStatus.FORBIDDEN,
  GRANT_INACTIVE: HttpStatus.FORBIDDEN,
  GRANT_EXPIRED: HttpStatus.FORBIDDEN,
  GRANT_NOT_STARTED: HttpStatus.FORBIDDEN,
  GRANT_REVOKED: HttpStatus.FORBIDDEN,
  UNAUTHORIZED_SCOPE: HttpStatus.FORBIDDEN,
  COMPLETION_VERSION_MISMATCH: HttpStatus.BAD_REQUEST,
  INVALID_PROGRESS_POSITION: HttpStatus.BAD_REQUEST,
  INVALID_CONTENT_HIERARCHY: HttpStatus.BAD_REQUEST,
  DUPLICATE_CONTENT_ORDER: HttpStatus.BAD_REQUEST,
  INVALID_STATUS_TRANSITION: HttpStatus.BAD_REQUEST,
  RIGHTS_NOT_CONFIRMED: HttpStatus.BAD_REQUEST,
};

@Catch(AcademyError)
export class AcademyExceptionFilter implements ExceptionFilter {
  catch(exception: AcademyError, host: ArgumentsHost) {
    const status =
      STATUS_CODES[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
    return host
      .switchToHttp()
      .getResponse<FastifyReply>()
      .status(status)
      .send({
        error: exception.code,
        message: exception.message,
        ...(exception.details ? { details: exception.details } : {}),
      });
  }
}
