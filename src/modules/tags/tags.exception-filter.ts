import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { TagsError, type TagsErrorCode } from './tags.error';

const STATUS_CODES = {
  TAG_NOT_FOUND: HttpStatus.NOT_FOUND,
  NAME_CONFLICT: HttpStatus.CONFLICT,
  SLUG_CONFLICT: HttpStatus.CONFLICT,
  TAG_IN_USE: HttpStatus.CONFLICT,
} as const satisfies Record<TagsErrorCode, number>;

@Catch(TagsError)
export class TagsExceptionFilter implements ExceptionFilter {
  catch(exception: TagsError, host: ArgumentsHost) {
    return host
      .switchToHttp()
      .getResponse<FastifyReply>()
      .status(STATUS_CODES[exception.code])
      .send({
        error: exception.code,
        message: exception.message,
        ...(exception.details ? { details: exception.details } : {}),
      });
  }
}
