import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { getClientIp } from '#src/common/get-client-ip';
import { ParseZodPipe } from '#src/common/parse-zod.pipe';
import { CurrentUser } from '#src/modules/security/current-user.decorator';
import { BearerAuthGuard } from '#src/modules/security/bearer-auth.guard';
import { PermissionGuard } from '#src/modules/security/permission.guard';
import { RequirePermissions } from '#src/modules/security/require-permissions.decorator';
import { TagsExceptionFilter } from './tags.exception-filter';
import {
  TagCreateBody,
  TagDeleteQuery,
  TagIdParam,
  TagParam,
  TagsQuery,
  TagUpdateBody,
} from './tags.schemas';
import { TagsService } from './tags.service';

@Controller('tags')
@UseFilters(TagsExceptionFilter)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  async selectAll(
    @Query(new ParseZodPipe(TagsQuery)) query: TagsQuery,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const [tags, total] = await Promise.all([
      this.tagsService.selectAll(query),
      this.tagsService.count(query),
    ]);
    response.header('total-items', total);
    return tags;
  }

  @Get(':identifier')
  selectByIdentifier(
    @Param(new ParseZodPipe(TagParam)) { identifier }: TagParam,
  ) {
    return this.tagsService.selectByIdentifier(identifier);
  }

  @Post()
  @UseGuards(BearerAuthGuard, PermissionGuard)
  @RequirePermissions('tags.manage')
  create(
    @Body(new ParseZodPipe(TagCreateBody)) body: TagCreateBody,
    @CurrentUser() user: CurrentUser,
    @Req() request: FastifyRequest,
  ) {
    return this.tagsService.create(body, {
      id: user.id,
      ipAddress: getClientIp(request),
    });
  }

  @Patch(':id')
  @UseGuards(BearerAuthGuard, PermissionGuard)
  @RequirePermissions('tags.manage')
  update(
    @Param(new ParseZodPipe(TagIdParam)) { id }: TagIdParam,
    @Body(new ParseZodPipe(TagUpdateBody)) body: TagUpdateBody,
    @CurrentUser() user: CurrentUser,
    @Req() request: FastifyRequest,
  ) {
    return this.tagsService.update(id, body, {
      id: user.id,
      ipAddress: getClientIp(request),
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(BearerAuthGuard, PermissionGuard)
  @RequirePermissions('tags.manage')
  async delete(
    @Param(new ParseZodPipe(TagIdParam)) { id }: TagIdParam,
    @Query(new ParseZodPipe(TagDeleteQuery)) query: TagDeleteQuery,
    @CurrentUser() user: CurrentUser,
    @Req() request: FastifyRequest,
  ): Promise<void> {
    await this.tagsService.delete(id, query.force, {
      id: user.id,
      ipAddress: getClientIp(request),
    });
  }
}
