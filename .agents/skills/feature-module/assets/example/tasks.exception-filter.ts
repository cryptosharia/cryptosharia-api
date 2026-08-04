import {
  Catch,
  ConflictException,
  ExceptionFilter,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { TasksError } from './tasks.error';

@Catch(TasksError)
export class TasksExceptionFilter implements ExceptionFilter {
  catch(error: TasksError) {
    switch (error.message) {
      case 'NOT_FOUND':
        throw new NotFoundException('Task not found');
      case 'SLUG_UNIQUE_VIOLATION':
        throw new ConflictException('Task slug already exists');
    }

    throw new InternalServerErrorException();
  }
}
