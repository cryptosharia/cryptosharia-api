import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import {
  APP_ERRORS,
  ForbiddenResponse,
  InternalServerErrorResponse,
  NotFoundResponse,
  UnauthorizedResponse,
} from './common/error-response.schemas';

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

    console.error('[Unhandled Exception]', exception);

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: APP_ERRORS.INTERNAL_SERVER_ERROR,
    } satisfies InternalServerErrorResponse);
  }
}
