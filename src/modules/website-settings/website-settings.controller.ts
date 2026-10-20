import {
  Body,
  Controller,
  Get,
  Put,
  Req,
  Res,
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
import type { CurrentUser as CurrentUserType } from '#src/modules/security/current-user.decorator';
import { UpdateAcademyVisibilityBody } from './website-settings.schemas';
import { WebsiteSettingsService } from './website-settings.service';

@Controller()
export class WebsiteSettingsController {
  constructor(private readonly settingsService: WebsiteSettingsService) {}

  @Public()
  @Get('public/site-settings/academy')
  async getPublicAcademyVisibility(
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    reply.header(
      'Cache-Control',
      'public, max-age=0, s-maxage=5, stale-while-revalidate=5',
    );
    return this.settingsService.getPublicAcademyVisibility();
  }

  @Get('admin/site-settings/academy')
  @UseGuards(AuthenticationGuard, PermissionGuard)
  @RequirePermissions('website.settings.manage')
  getAdminAcademyVisibility() {
    return this.settingsService.getAdminAcademyVisibility();
  }

  @Put('admin/site-settings/academy')
  @UseGuards(AuthenticationGuard, PermissionGuard)
  @RequirePermissions('website.settings.manage')
  updateAcademyVisibility(
    @Body(new ParseZodPipe(UpdateAcademyVisibilityBody))
    body: UpdateAcademyVisibilityBody,
    @CurrentUser() user: CurrentUserType,
    @Req() request: FastifyRequest,
  ) {
    return this.settingsService.updateAcademyVisibility(body, {
      id: user.id,
      ipAddress: getClientIp(request),
    });
  }
}
