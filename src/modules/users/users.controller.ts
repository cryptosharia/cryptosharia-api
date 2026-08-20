import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { getClientIp } from '#src/common/get-client-ip';
import { Query } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { CurrentUser } from '#src/modules/security/current-user.decorator';
import { ParseZodPipe } from '#src/common/parse-zod.pipe';
import { AuthenticationGuard } from '#src/modules/security/authentication.guard';
import { PermissionGuard } from '#src/modules/security/permission.guard';
import { RequirePermissions } from '#src/modules/security/require-permissions.decorator';
import { UsersExceptionFilter } from './users.exception-filter';
import { UserParam, UserUpdateBody, UsersQuery } from './users.schemas';
import { UsersService } from './users.service';

@Controller('users')
@UseFilters(UsersExceptionFilter)
@UseGuards(AuthenticationGuard, PermissionGuard)
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
  @RequirePermissions({ permissions: ['users.read'], allowOwner: true })
  async selectById(@Param(new ParseZodPipe(UserParam)) { id }: UserParam) {
    return this.usersService.selectById(id);
  }

  @Patch(':id')
  @RequirePermissions({ permissions: ['users.update'], allowOwner: true })
  async update(
    @Param(new ParseZodPipe(UserParam)) { id }: UserParam,
    @Body(new ParseZodPipe(UserUpdateBody)) body: UserUpdateBody,
    @CurrentUser() currentUser: CurrentUser,
    @Req() request: FastifyRequest,
  ) {
    if (
      body.status !== undefined &&
      !currentUser.permissions.includes('users.manage_status')
    ) {
      throw new ForbiddenException();
    }
    if (
      body.role !== undefined &&
      !currentUser.permissions.includes('users.manage_role')
    ) {
      throw new ForbiddenException();
    }

    return this.usersService.update(id, body, {
      id: currentUser.id,
      ipAddress: getClientIp(request),
    });
  }
}
