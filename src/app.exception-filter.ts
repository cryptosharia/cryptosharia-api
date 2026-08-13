import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  HttpStatus,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import {
  APP_ERRORS,
  ForbiddenResponse,
  InternalServerErrorResponse,
  NotFoundResponse,
  UnauthorizedResponse,
  TooManyRequestsResponse,
  ServiceUnavailableResponse,
} from './common/error-response.schemas';
import { TooManyRequestsException } from './common/too-many-requests.exception';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<FastifyReply>();

    if (exception instanceof UnauthorizedException) {
      return res.status(HttpStatus.UNAUTHORIZED).send({
        error: 'UNAUTHORIZED',
        message: APP_ERRORS.UNAUTHORIZED,
      } satisfies UnauthorizedResponse);
    }

    if (exception instanceof ForbiddenException) {
      return res.status(HttpStatus.FORBIDDEN).send({
        error: 'FORBIDDEN',
        message: APP_ERRORS.FORBIDDEN,
      } satisfies ForbiddenResponse);
    }

    if (exception instanceof NotFoundException) {
      return res.status(HttpStatus.NOT_FOUND).send({
        error: 'NOT_FOUND',
        message: APP_ERRORS.NOT_FOUND,
      } satisfies NotFoundResponse);
    }

    if (exception instanceof TooManyRequestsException) {
      return res.status(HttpStatus.TOO_MANY_REQUESTS).send({
        error: 'TOO_MANY_REQUESTS',
        message: APP_ERRORS.TOO_MANY_REQUESTS,
      } satisfies TooManyRequestsResponse);
    }

    if (exception instanceof ServiceUnavailableException) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).send({
        error: 'SERVICE_UNAVAILABLE',
        message: APP_ERRORS.SERVICE_UNAVAILABLE,
      } satisfies ServiceUnavailableResponse);
    }

    console.error('[Unhandled Exception]', exception);

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: APP_ERRORS.INTERNAL_SERVER_ERROR,
    } satisfies InternalServerErrorResponse);
  }
}
