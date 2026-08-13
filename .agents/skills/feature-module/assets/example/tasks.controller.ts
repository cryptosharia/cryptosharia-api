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
import { CurrentUser } from '#src/modules/security/current-user.decorator';
import { TasksExceptionFilter } from './tasks.exception-filter';
import { AuthGuard } from '#src/modules/auth/auth.guard';
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
    @CurrentUser() user: CurrentUser,
  ): Promise<TaskResponse[]> {
    return this.tasksService.selectAll(user.id);
  }

  @Get(':id')
  async selectById(
    @Param(new ParseZodPipe(TaskParam)) param: TaskParam,
    @CurrentUser() user: CurrentUser,
  ): Promise<TaskResponse> {
    return this.tasksService.selectById(param.id, user.id);
  }

  @Post()
  async insert(
    @CurrentUser() user: CurrentUser,
    @Body(new ParseZodPipe(InsertBody)) body: InsertBody,
  ): Promise<TaskResponse> {
    return this.tasksService.insert(user.id, body);
  }

  @Put(':id')
  async update(
    @Param(new ParseZodPipe(TaskParam)) param: TaskParam,
    @CurrentUser() user: CurrentUser,
    @Body(new ParseZodPipe(UpdateBody)) body: UpdateBody,
  ): Promise<TaskResponse> {
    return this.tasksService.update(param.id, user.id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param(new ParseZodPipe(TaskParam)) param: TaskParam,
    @CurrentUser() user: CurrentUser,
  ): Promise<void> {
    await this.tasksService.delete(param.id, user.id);
  }
}
