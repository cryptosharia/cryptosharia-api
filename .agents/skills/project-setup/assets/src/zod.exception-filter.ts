import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { z, ZodError } from 'zod';
import { ValidationFailedResponse } from './common/error-response.schemas';
import { FastifyReply } from 'fastify';

@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  catch(exception: ZodError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<FastifyReply>();

    return res.status(HttpStatus.BAD_REQUEST).send({
      error: 'VALIDATION_FAILED',
      message: z.flattenError(exception).fieldErrors,
    } satisfies ValidationFailedResponse);
  }
}
