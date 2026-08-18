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
import { CryptoassetsExceptionFilter } from './cryptoassets.exception-filter';
import {
  CryptoassetCreateBody,
  CryptoassetIdParam,
  CryptoassetParam,
  CryptoassetQuoteQuery,
  CryptoassetsQuery,
  CryptoassetUpdateBody,
} from './cryptoassets.schemas';
import { CryptoassetsService } from './cryptoassets.service';

@Controller('cryptoassets')
@UseFilters(CryptoassetsExceptionFilter)
export class CryptoassetsController {
  constructor(private readonly cryptoassetsService: CryptoassetsService) {}

  @Get()
  async selectAll(
    @Query(new ParseZodPipe(CryptoassetsQuery)) query: CryptoassetsQuery,
    @Res({ passthrough: true }) response: FastifyReply,
    @CurrentUser() user: CurrentUser | null,
  ) {
    const canManage =
      user?.permissions.includes('cryptoassets.manage') ?? false;
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
        : (['published'] as CryptoassetsQuery['statuses']),
    };
    const [cryptoassets, total] = await Promise.all([
      this.cryptoassetsService.selectAll(filters),
      this.cryptoassetsService.count(filters),
    ]);
    response.header('total-items', total);
    return cryptoassets;
  }

  @Get(':identifier')
  selectByIdentifier(
    @Param(new ParseZodPipe(CryptoassetParam)) { identifier }: CryptoassetParam,
    @Query(new ParseZodPipe(CryptoassetQuoteQuery))
    query: CryptoassetQuoteQuery,
    @CurrentUser() user: CurrentUser | null,
  ) {
    const canManage =
      user?.permissions.includes('cryptoassets.manage') ?? false;
    return this.cryptoassetsService.selectByIdentifier(
      identifier,
      { canViewNonPublished: canManage },
      query.quote,
    );
  }

  @Post()
  @UseGuards(AuthenticationGuard, PermissionGuard)
  @RequirePermissions('cryptoassets.manage')
  create(
    @Body(new ParseZodPipe(CryptoassetCreateBody)) body: CryptoassetCreateBody,
    @CurrentUser() user: CurrentUser,
    @Req() request: FastifyRequest,
  ) {
    return this.cryptoassetsService.create(body, {
      id: user.id,
      ipAddress: getClientIp(request),
    });
  }

  @Patch(':id')
  @UseGuards(AuthenticationGuard, PermissionGuard)
  @RequirePermissions('cryptoassets.manage')
  update(
    @Param(new ParseZodPipe(CryptoassetIdParam)) { id }: CryptoassetIdParam,
    @Body(new ParseZodPipe(CryptoassetUpdateBody)) body: CryptoassetUpdateBody,
    @CurrentUser() user: CurrentUser,
    @Req() request: FastifyRequest,
  ) {
    return this.cryptoassetsService.update(id, body, {
      id: user.id,
      ipAddress: getClientIp(request),
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthenticationGuard, PermissionGuard)
  @RequirePermissions('cryptoassets.manage')
  async delete(
    @Param(new ParseZodPipe(CryptoassetIdParam)) { id }: CryptoassetIdParam,
    @CurrentUser() user: CurrentUser,
    @Req() request: FastifyRequest,
  ): Promise<void> {
    await this.cryptoassetsService.delete(id, {
      id: user.id,
      ipAddress: getClientIp(request),
    });
  }
}
