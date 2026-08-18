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
import { TokensExceptionFilter } from './tokens.exception-filter';
import {
  TokenCreateBody,
  TokenIdParam,
  TokenParam,
  TokenQuoteQuery,
  TokensQuery,
  TokenUpdateBody,
} from './tokens.schemas';
import { TokensService } from './tokens.service';

@Controller('tokens')
@UseFilters(TokensExceptionFilter)
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Get()
  async selectAll(
    @Query(new ParseZodPipe(TokensQuery)) query: TokensQuery,
    @Res({ passthrough: true }) response: FastifyReply,
    @CurrentUser() user: CurrentUser | null,
  ) {
    const canManage = user?.permissions.includes('tokens.manage') ?? false;
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
        : (['published'] as TokensQuery['statuses']),
    };
    const [tokens, total] = await Promise.all([
      this.tokensService.selectAll(filters),
      this.tokensService.count(filters),
    ]);
    response.header('total-items', total);
    return tokens;
  }

  @Get(':identifier')
  selectByIdentifier(
    @Param(new ParseZodPipe(TokenParam)) { identifier }: TokenParam,
    @Query(new ParseZodPipe(TokenQuoteQuery)) query: TokenQuoteQuery,
    @CurrentUser() user: CurrentUser | null,
  ) {
    const canManage = user?.permissions.includes('tokens.manage') ?? false;
    return this.tokensService.selectByIdentifier(
      identifier,
      { canViewNonPublished: canManage },
      query.quote,
    );
  }

  @Post()
  @UseGuards(AuthenticationGuard, PermissionGuard)
  @RequirePermissions('tokens.manage')
  create(
    @Body(new ParseZodPipe(TokenCreateBody)) body: TokenCreateBody,
    @CurrentUser() user: CurrentUser,
    @Req() request: FastifyRequest,
  ) {
    return this.tokensService.create(body, {
      id: user.id,
      ipAddress: getClientIp(request),
    });
  }

  @Patch(':id')
  @UseGuards(AuthenticationGuard, PermissionGuard)
  @RequirePermissions('tokens.manage')
  update(
    @Param(new ParseZodPipe(TokenIdParam)) { id }: TokenIdParam,
    @Body(new ParseZodPipe(TokenUpdateBody)) body: TokenUpdateBody,
    @CurrentUser() user: CurrentUser,
    @Req() request: FastifyRequest,
  ) {
    return this.tokensService.update(id, body, {
      id: user.id,
      ipAddress: getClientIp(request),
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthenticationGuard, PermissionGuard)
  @RequirePermissions('tokens.manage')
  async delete(
    @Param(new ParseZodPipe(TokenIdParam)) { id }: TokenIdParam,
    @CurrentUser() user: CurrentUser,
    @Req() request: FastifyRequest,
  ): Promise<void> {
    await this.tokensService.delete(id, {
      id: user.id,
      ipAddress: getClientIp(request),
    });
  }
}
