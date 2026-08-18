import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import {
  CryptoassetsError,
  type CryptoassetsErrorCode,
} from './cryptoassets.error';

const STATUS_CODES = {
  CRYPTOASSET_NOT_FOUND: HttpStatus.NOT_FOUND,
  SLUG_CONFLICT: HttpStatus.CONFLICT,
  TICKER_CONFLICT: HttpStatus.CONFLICT,
  QUOTES_UNAVAILABLE: HttpStatus.BAD_GATEWAY,
} as const satisfies Record<CryptoassetsErrorCode, number>;

@Catch(CryptoassetsError)
export class CryptoassetsExceptionFilter implements ExceptionFilter {
  catch(exception: CryptoassetsError, host: ArgumentsHost) {
    return host
      .switchToHttp()
      .getResponse<FastifyReply>()
      .status(STATUS_CODES[exception.code])
      .send({ error: exception.code, message: exception.message });
  }
}
