import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { MessagesError, type MessagesErrorCode } from './messages.error';

const STATUS_CODES = {
  MESSAGE_NOT_FOUND: HttpStatus.NOT_FOUND,
} as const satisfies Record<MessagesErrorCode, number>;

@Catch(MessagesError)
export class MessagesExceptionFilter implements ExceptionFilter {
  catch(exception: MessagesError, host: ArgumentsHost) {
    return host
      .switchToHttp()
      .getResponse<FastifyReply>()
      .status(STATUS_CODES[exception.code])
      .send({ error: exception.code, message: exception.message });
  }
}
