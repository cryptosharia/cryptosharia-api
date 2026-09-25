import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import {
  TeamMembersError,
  type TeamMembersErrorCode,
} from './team-members.error';

const STATUS_CODES = {
  TEAM_MEMBER_NOT_FOUND: HttpStatus.NOT_FOUND,
  SLUG_ALREADY_EXISTS: HttpStatus.CONFLICT,
  INVALID_EXPERTISE_DATA: HttpStatus.BAD_REQUEST,
} as const satisfies Record<TeamMembersErrorCode, number>;

@Catch(TeamMembersError)
export class TeamMembersExceptionFilter implements ExceptionFilter {
  catch(exception: TeamMembersError, host: ArgumentsHost) {
    return host
      .switchToHttp()
      .getResponse<FastifyReply>()
      .status(STATUS_CODES[exception.code])
      .send({
        error: exception.code,
        message: exception.message,
      });
  }
}
