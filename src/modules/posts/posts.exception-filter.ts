import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { PostsError, type PostsErrorCode } from './posts.error';

const STATUS_CODES = {
  POST_NOT_FOUND: HttpStatus.NOT_FOUND,
  SLUG_CONFLICT: HttpStatus.CONFLICT,
} as const satisfies Record<PostsErrorCode, number>;

@Catch(PostsError)
export class PostsExceptionFilter implements ExceptionFilter {
  catch(exception: PostsError, host: ArgumentsHost) {
    return host
      .switchToHttp()
      .getResponse<FastifyReply>()
      .status(STATUS_CODES[exception.code])
      .send({ error: exception.code, message: exception.message });
  }
}
