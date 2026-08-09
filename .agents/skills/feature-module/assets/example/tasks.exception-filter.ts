import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { TasksError, TasksErrorCode } from './tasks.error';

const STATUS_CODES = {
  TASK_NOT_FOUND: HttpStatus.NOT_FOUND,
  SLUG_UNIQUE_VIOLATION: HttpStatus.CONFLICT,
} as const satisfies Record<TasksErrorCode, number>;

@Catch(TasksError)
export class TasksExceptionFilter implements ExceptionFilter {
  catch(exception: TasksError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<FastifyReply>();

    return res.status(STATUS_CODES[exception.code]).send({
      error: exception.code,
      message: exception.message,
    });
  }
}
