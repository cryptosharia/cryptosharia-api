import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ParseZodPipe } from '#src/common/parse-zod.pipe';
import { BearerAuthGuard } from '#src/modules/security/bearer-auth.guard';
import { PermissionGuard } from '#src/modules/security/permission.guard';
import { RequirePermissions } from '#src/modules/security/require-permissions.decorator';
import { MessagesExceptionFilter } from './messages.exception-filter';
import {
  MessageCreateBody,
  MessageIdParam,
  MessagesQuery,
} from './messages.schemas';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseFilters(MessagesExceptionFilter)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(@Body(new ParseZodPipe(MessageCreateBody)) body: MessageCreateBody) {
    return this.messagesService.create(body);
  }

  @Get()
  @UseGuards(BearerAuthGuard, PermissionGuard)
  @RequirePermissions('messages.read')
  async selectAll(
    @Query(new ParseZodPipe(MessagesQuery)) query: MessagesQuery,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const [messages, total] = await Promise.all([
      this.messagesService.selectAll(query),
      this.messagesService.count(query),
    ]);
    response.header('total-items', total);
    return messages;
  }

  @Get(':id')
  @UseGuards(BearerAuthGuard, PermissionGuard)
  @RequirePermissions('messages.read')
  selectById(@Param(new ParseZodPipe(MessageIdParam)) { id }: MessageIdParam) {
    return this.messagesService.selectById(id);
  }
}
