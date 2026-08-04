import {
  Controller,
  Get,
  Param,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { ParseZodPipe } from '#src/common/parse-zod.pipe';
import { UsersService } from './users.service';
import { UserParam, UserResponse } from './users.schemas';
import { UsersExceptionFilter } from './users.exception-filter';
import { ExcludePasswordInterceptor } from './exclude-password.interceptor';

@UseInterceptors(ExcludePasswordInterceptor)
@UseFilters(UsersExceptionFilter)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Get()
  async selectAll(): Promise<UserResponse[]> {
    return this.usersService.selectAll();
  }

  @Get(':id')
  async selectById(
    @Param(new ParseZodPipe(UserParam)) param: UserParam,
  ): Promise<UserResponse> {
    return this.usersService.selectById(param.id);
  }
}
