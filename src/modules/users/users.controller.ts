import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Put,
  Res,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Query } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { CurrentUserId } from '#src/common/current-user-id.decorator';
import { CurrentUser } from '#src/common/current-user.decorator';
import { ParseZodPipe } from '#src/common/parse-zod.pipe';
import { BearerAuthGuard } from '#src/modules/security/bearer-auth.guard';
import { PermissionGuard } from '#src/modules/security/permission.guard';
import { RequirePermissions } from '#src/modules/security/require-permissions.decorator';
import type { User } from '#src/modules/drizzle/drizzle.types';
import { UsersExceptionFilter } from './users.exception-filter';
import { ExcludeSensitiveFieldsInterceptor } from './exclude-sensitive-fields.interceptor';
import {
  ProfileUpdateBody,
  RoleBody,
  StatusBody,
  UserParam,
  UsersQuery,
} from './users.schemas';
import { UsersService } from './users.service';

@Controller('users')
@UseFilters(UsersExceptionFilter)
@UseGuards(BearerAuthGuard, PermissionGuard)
@UseInterceptors(ExcludeSensitiveFieldsInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.read')
  async selectAll(
    @Query(new ParseZodPipe(UsersQuery)) query: UsersQuery,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const [users, total] = await Promise.all([
      this.usersService.selectAll(query),
      this.usersService.count(query),
    ]);
    response.header('total-items', total);
    return users;
  }

  @Get(':id')
  async selectById(
    @Param(new ParseZodPipe(UserParam)) { id }: UserParam,
    @CurrentUser() currentUser: FastifyRequest['user'],
  ) {
    if (
      id !== currentUser?.id &&
      !currentUser?.permissions.includes('users.read')
    )
      throw new ForbiddenException();
    return this.usersService.selectById(id);
  }

  @Patch(':id')
  async updateProfile(
    @Param(new ParseZodPipe(UserParam)) { id }: UserParam,
    @Body(new ParseZodPipe(ProfileUpdateBody)) body: ProfileUpdateBody,
    @CurrentUser() currentUser: FastifyRequest['user'],
  ) {
    if (
      id !== currentUser?.id &&
      !currentUser?.permissions.includes('users.update')
    )
      throw new ForbiddenException();
    return this.usersService.update(id, body, currentUser.id);
  }

  @Put(':id/status')
  @RequirePermissions('users.manage_status')
  async updateStatus(
    @Param(new ParseZodPipe(UserParam)) { id }: UserParam,
    @Body(new ParseZodPipe(StatusBody)) body: StatusBody,
    @CurrentUserId() currentUserId: User['id'],
  ) {
    return this.usersService.update(id, body, currentUserId);
  }

  @Put(':id/role')
  @RequirePermissions('users.manage_role')
  async updateRole(
    @Param(new ParseZodPipe(UserParam)) { id }: UserParam,
    @Body(new ParseZodPipe(RoleBody)) body: RoleBody,
    @CurrentUserId() currentUserId: User['id'],
  ) {
    return this.usersService.update(id, body, currentUserId);
  }
}
