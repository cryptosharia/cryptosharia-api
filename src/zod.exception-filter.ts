import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { z, ZodError } from 'zod';
import {
  APP_ERRORS,
  ValidationFailedResponse,
} from './common/error-response.schemas';
import { FastifyReply } from 'fastify';

@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  catch(exception: ZodError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<FastifyReply>();
    const { fieldErrors, formErrors } = z.flattenError(exception);

    return res.status(HttpStatus.UNPROCESSABLE_ENTITY).send({
      error: 'VALIDATION_FAILED',
      message: APP_ERRORS.VALIDATION_FAILED,
      details: {
        root: formErrors,
        fields: fieldErrors,
      },
    } satisfies ValidationFailedResponse);
  }
}
