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
import { Public } from '#src/common/public.decorator';
import { CurrentUser } from '#src/modules/security/current-user.decorator';
import { AuthenticationGuard } from '#src/modules/security/authentication.guard';
import { PermissionGuard } from '#src/modules/security/permission.guard';
import { RequirePermissions } from '#src/modules/security/require-permissions.decorator';
import { TeamMembersExceptionFilter } from './team-members.exception-filter';
import {
  TeamMemberCreateBody,
  TeamMemberIdParam,
  TeamMembersQuery,
  TeamMemberUpdateBody,
} from './team-members.schemas';
import { TeamMembersService } from './team-members.service';

@Controller('team-members')
@UseFilters(TeamMembersExceptionFilter)
export class TeamMembersController {
  constructor(private readonly teamMembersService: TeamMembersService) {}

  @Public()
  @Get()
  async selectAll(
    @Query(new ParseZodPipe(TeamMembersQuery)) query: TeamMembersQuery,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const [items, total] = await Promise.all([
      this.teamMembersService.selectAll(query),
      this.teamMembersService.count(query),
    ]);
    response.header('total-items', total);
    return items;
  }

  @Public()
  @Get(':id')
  selectByIdentifier(
    @Param(new ParseZodPipe(TeamMemberIdParam)) { id }: TeamMemberIdParam,
  ) {
    return this.teamMembersService.selectByIdentifier(id);
  }

  @Post()
  @UseGuards(AuthenticationGuard, PermissionGuard)
  @RequirePermissions('team.manage', 'posts.manage')
  create(
    @Body(new ParseZodPipe(TeamMemberCreateBody)) body: TeamMemberCreateBody,
    @CurrentUser() user: CurrentUser,
    @Req() request: FastifyRequest,
  ) {
    return this.teamMembersService.create(body, {
      id: user.id,
      ipAddress: getClientIp(request),
    });
  }

  @Patch(':id')
  @UseGuards(AuthenticationGuard, PermissionGuard)
  @RequirePermissions('team.manage', 'posts.manage')
  update(
    @Param(new ParseZodPipe(TeamMemberIdParam)) { id }: TeamMemberIdParam,
    @Body(new ParseZodPipe(TeamMemberUpdateBody)) body: TeamMemberUpdateBody,
    @CurrentUser() user: CurrentUser,
    @Req() request: FastifyRequest,
  ) {
    return this.teamMembersService.update(id, body, {
      id: user.id,
      ipAddress: getClientIp(request),
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthenticationGuard, PermissionGuard)
  @RequirePermissions('team.manage', 'posts.manage')
  async delete(
    @Param(new ParseZodPipe(TeamMemberIdParam)) { id }: TeamMemberIdParam,
    @CurrentUser() user: CurrentUser,
    @Req() request: FastifyRequest,
  ): Promise<void> {
    await this.teamMembersService.delete(id, {
      id: user.id,
      ipAddress: getClientIp(request),
    });
  }
}
