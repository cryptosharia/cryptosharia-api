import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { AuthenticationGuard } from '#src/modules/security/authentication.guard';
import { PermissionGuard } from '#src/modules/security/permission.guard';
import { RequirePermissions } from '#src/modules/security/require-permissions.decorator';
import { PostsExceptionFilter } from './posts.exception-filter';
import {
  PostCreateBody,
  PostIdParam,
  PostParam,
  PostsQuery,
  PostUpdateBody,
} from './posts.schemas';
import { PostsService } from './posts.service';

@Controller('posts')
@UseFilters(PostsExceptionFilter)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async selectAll(
    @Query(new ParseZodPipe(PostsQuery)) query: PostsQuery,
    @Res({ passthrough: true }) response: FastifyReply,
    @CurrentUser() user: CurrentUser | null,
  ) {
    const canManage = user?.permissions.includes('posts.manage') ?? false;
    const requestedStatuses = query.statuses;
    if (
      !canManage &&
      requestedStatuses?.some((status) => status !== 'published')
    ) {
      throw new ForbiddenException();
    }

    const filters = {
      ...query,
      statuses: canManage
        ? requestedStatuses
        : (['published'] as PostsQuery['statuses']),
    };
    const [posts, total] = await Promise.all([
      this.postsService.selectAll(filters),
      this.postsService.count(filters),
    ]);
    response.header('total-items', total);
    return posts;
  }

  @Get(':identifier')
  selectByIdentifier(
    @Param(new ParseZodPipe(PostParam)) { identifier }: PostParam,
    @CurrentUser() user: CurrentUser | null,
  ) {
    const canManage = user?.permissions.includes('posts.manage') ?? false;

    return this.postsService.selectByIdentifier(identifier, {
      canViewNonPublished: canManage,
    });
  }

  @Post()
  @UseGuards(AuthenticationGuard, PermissionGuard)
  @RequirePermissions('posts.manage')
  create(
    @Body(new ParseZodPipe(PostCreateBody)) body: PostCreateBody,
    @CurrentUser() user: CurrentUser,
    @Req() request: FastifyRequest,
  ) {
    return this.postsService.create(body, {
      id: user.id,
      ipAddress: getClientIp(request),
    });
  }

  @Patch(':id')
  @UseGuards(AuthenticationGuard, PermissionGuard)
  @RequirePermissions('posts.manage')
  update(
    @Param(new ParseZodPipe(PostIdParam)) { id }: PostIdParam,
    @Body(new ParseZodPipe(PostUpdateBody)) body: PostUpdateBody,
    @CurrentUser() user: CurrentUser,
    @Req() request: FastifyRequest,
  ) {
    return this.postsService.update(id, body, {
      id: user.id,
      ipAddress: getClientIp(request),
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthenticationGuard, PermissionGuard)
  @RequirePermissions('posts.manage')
  async delete(
    @Param(new ParseZodPipe(PostIdParam)) { id }: PostIdParam,
    @CurrentUser() user: CurrentUser,
    @Req() request: FastifyRequest,
  ): Promise<void> {
    await this.postsService.delete(id, {
      id: user.id,
      ipAddress: getClientIp(request),
    });
  }
}
