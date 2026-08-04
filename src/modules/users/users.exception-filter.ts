import {
  Catch,
  ConflictException,
  ExceptionFilter,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UsersError } from './users.error';

@Catch(UsersError)
export class UsersExceptionFilter implements ExceptionFilter {
  catch(error: UsersError) {
    switch (error.message) {
      case 'NOT_FOUND':
        throw new NotFoundException('User not found');
      case 'EMAIL_UNIQUE_VIOLATION':
        throw new ConflictException('Email already taken');
    }
    throw new InternalServerErrorException();
  }
}
