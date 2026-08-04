import {
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { z, ZodError } from 'zod';
import { HttpValidationError } from './common/http-error.schema';

@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  catch(error: ZodError) {
    throw new BadRequestException({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: z.flattenError(error).fieldErrors,
    } satisfies HttpValidationError);
  }
}
