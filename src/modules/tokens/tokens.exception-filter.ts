import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { TokensError, type TokensErrorCode } from './tokens.error';

const STATUS_CODES = {
  TOKEN_NOT_FOUND: HttpStatus.NOT_FOUND,
  SLUG_CONFLICT: HttpStatus.CONFLICT,
  TICKER_CONFLICT: HttpStatus.CONFLICT,
  QUOTES_UNAVAILABLE: HttpStatus.BAD_GATEWAY,
} as const satisfies Record<TokensErrorCode, number>;

@Catch(TokensError)
export class TokensExceptionFilter implements ExceptionFilter {
  catch(exception: TokensError, host: ArgumentsHost) {
    return host
      .switchToHttp()
      .getResponse<FastifyReply>()
      .status(STATUS_CODES[exception.code])
      .send({ error: exception.code, message: exception.message });
  }
}
