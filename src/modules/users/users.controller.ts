import {
  Body,
  Controller,
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
import type { FastifyReply } from 'fastify';
import { CurrentUser } from '#src/modules/security/current-user.decorator';
import { ParseZodPipe } from '#src/common/parse-zod.pipe';
import { BearerAuthGuard } from '#src/modules/security/bearer-auth.guard';
import { PermissionGuard } from '#src/modules/security/permission.guard';
import { RequirePermissions } from '#src/modules/security/require-permissions.decorator';
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
  @RequirePermissions({ permissions: ['users.read'], allowOwner: true })
  async selectById(@Param(new ParseZodPipe(UserParam)) { id }: UserParam) {
    return this.usersService.selectById(id);
  }

  @Patch(':id')
  @RequirePermissions({ permissions: ['users.update'], allowOwner: true })
  async updateProfile(
    @Param(new ParseZodPipe(UserParam)) { id }: UserParam,
    @Body(new ParseZodPipe(ProfileUpdateBody)) body: ProfileUpdateBody,
    @CurrentUser() currentUser: CurrentUser,
  ) {
    return this.usersService.update(id, body, currentUser.id);
  }

  @Put(':id/status')
  @RequirePermissions('users.manage_status')
  async updateStatus(
    @Param(new ParseZodPipe(UserParam)) { id }: UserParam,
    @Body(new ParseZodPipe(StatusBody)) body: StatusBody,
    @CurrentUser() currentUser: CurrentUser,
  ) {
    return this.usersService.update(id, body, currentUser.id);
  }

  @Put(':id/role')
  @RequirePermissions('users.manage_role')
  async updateRole(
    @Param(new ParseZodPipe(UserParam)) { id }: UserParam,
    @Body(new ParseZodPipe(RoleBody)) body: RoleBody,
    @CurrentUser() currentUser: CurrentUser,
  ) {
    return this.usersService.update(id, body, currentUser.id);
  }
}
