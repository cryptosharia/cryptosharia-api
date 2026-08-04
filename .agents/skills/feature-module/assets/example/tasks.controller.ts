import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  UseFilters,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CurrentUserId } from '#src/common/current-user-id.decorator';
import { TasksExceptionFilter } from './tasks.exception-filter';
import { AuthGuard } from '#src/modules/auth/auth.guard';
import { User } from '#src/modules/drizzle/drizzle.types';
import { ParseZodPipe } from '#src/common/parse-zod.pipe';
import {
  InsertBody,
  UpdateBody,
  TaskParam,
  TaskResponse,
} from './tasks.schemas';

@UseGuards(AuthGuard)
@UseFilters(TasksExceptionFilter)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async selectAll(
    @CurrentUserId() userId: User['id'],
  ): Promise<TaskResponse[]> {
    return this.tasksService.selectAll(userId);
  }

  @Get(':id')
  async selectById(
    @Param(new ParseZodPipe(TaskParam)) param: TaskParam,
    @CurrentUserId() userId: User['id'],
  ): Promise<TaskResponse> {
    return this.tasksService.selectById(param.id, userId);
  }

  @Post()
  async insert(
    @CurrentUserId() userId: User['id'],
    @Body(new ParseZodPipe(InsertBody)) body: InsertBody,
  ): Promise<TaskResponse> {
    return this.tasksService.insert(userId, body);
  }

  @Put(':id')
  async update(
    @Param(new ParseZodPipe(TaskParam)) param: TaskParam,
    @CurrentUserId() userId: User['id'],
    @Body(new ParseZodPipe(UpdateBody)) body: UpdateBody,
  ): Promise<TaskResponse> {
    return this.tasksService.update(param.id, userId, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param(new ParseZodPipe(TaskParam)) param: TaskParam,
    @CurrentUserId() userId: User['id'],
  ): Promise<void> {
    await this.tasksService.delete(param.id, userId);
  }
}
