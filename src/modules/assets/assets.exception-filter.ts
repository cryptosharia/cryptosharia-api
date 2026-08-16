import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AssetsError, type AssetsErrorCode } from './assets.error';

const STATUS_CODES = {
  STORAGE_UPLOAD_FAILED: HttpStatus.BAD_GATEWAY,
  IMAGE_UPLOAD_FAILED: HttpStatus.BAD_GATEWAY,
} as const satisfies Record<AssetsErrorCode, number>;

@Catch(AssetsError)
export class AssetsExceptionFilter implements ExceptionFilter {
  catch(exception: AssetsError, host: ArgumentsHost) {
    return host
      .switchToHttp()
      .getResponse<FastifyReply>()
      .status(STATUS_CODES[exception.code])
      .send({ error: exception.code, message: exception.message });
  }
}
