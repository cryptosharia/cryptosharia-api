import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { UsersError, UsersErrorCode } from './users.error';

const STATUS_CODES = {
  USER_NOT_FOUND: HttpStatus.NOT_FOUND,
  EMAIL_UNIQUE_VIOLATION: HttpStatus.CONFLICT,
} as const satisfies Record<UsersErrorCode, number>;

@Catch(UsersError)
export class UsersExceptionFilter implements ExceptionFilter {
  catch(exception: UsersError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<FastifyReply>();

    return res.status(STATUS_CODES[exception.code]).send({
      error: exception.code,
      message: exception.message,
    });
  }
}
