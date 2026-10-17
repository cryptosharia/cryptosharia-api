import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ParseZodPipe } from '#src/common/parse-zod.pipe';
import { CurrentUser } from '#src/modules/security/current-user.decorator';
import { AuthenticationGuard } from '#src/modules/security/authentication.guard';
import { PermissionGuard } from '#src/modules/security/permission.guard';
import { RequirePermissions } from '#src/modules/security/require-permissions.decorator';
import { AcademyExceptionFilter } from './academy.exception-filter';
import {
  AdminContentQuery,
  AdminDashboardStats,
  AdminGrantsQuery,
  ContentIdParam,
  ContentTransitionBody,
  CreateContentBody,
  CreateGrantBody,
  CreateScopeBody,
  GrantIdParam,
  ScopeIdParam,
  SetLessonMediaBody,
  UpdateContentBody,
  UpdateScopeBody,
} from './academy.schemas';
import { AcademyService } from './academy.service';

@Controller('academy/admin')
@UseFilters(AcademyExceptionFilter)
@UseGuards(AuthenticationGuard, PermissionGuard)
export class AcademyAdminController {
  constructor(private readonly academyService: AcademyService) {}

  // ==========================================
  // Stats
  // ==========================================

  @Get('stats')
  @RequirePermissions('academy.manage')
  async getStats(): Promise<AdminDashboardStats> {
    return this.academyService.getAdminStats();
  }

  // ==========================================
  // Scopes
  // ==========================================

  @Get('scopes')
  @RequirePermissions('academy.manage')
  async getScopes() {
    return this.academyService.getAdminScopes();
  }

  @Post('scopes')
  @RequirePermissions('academy.manage')
  async createScope(
    @Body(new ParseZodPipe(CreateScopeBody)) body: CreateScopeBody,
    @CurrentUser() user: CurrentUser,
  ) {
    return this.academyService.createScope({
      ...body,
      createdBy: user.id,
    });
  }

  @Put('scopes/:id')
  @RequirePermissions('academy.manage')
  async updateScope(
    @Param(new ParseZodPipe(ScopeIdParam)) { id }: ScopeIdParam,
    @Body(new ParseZodPipe(UpdateScopeBody)) body: UpdateScopeBody,
    @CurrentUser() user: CurrentUser,
  ) {
    return this.academyService.updateScope(id, {
      ...body,
      updatedBy: user.id,
    });
  }

  // ==========================================
  // Curriculum & Content Management
  // ==========================================

  @Get('content')
  @RequirePermissions('academy.manage')
  async getContent(
    @Query(new ParseZodPipe(AdminContentQuery)) query: AdminContentQuery,
  ) {
    return this.academyService.getAdminContent(query);
  }

  @Get('content/:id')
  @RequirePermissions('academy.manage')
  async getContentById(
    @Param(new ParseZodPipe(ContentIdParam)) { id }: ContentIdParam,
  ) {
    return this.academyService.getContentById(id);
  }

  @Post('content')
  @RequirePermissions('academy.manage')
  async createContent(
    @Body(new ParseZodPipe(CreateContentBody)) body: CreateContentBody,
    @CurrentUser() user: CurrentUser,
  ) {
    return this.academyService.createContent({
      ...body,
      createdBy: user.id,
    });
  }

  @Put('content/:id')
  @RequirePermissions('academy.manage')
  async updateContent(
    @Param(new ParseZodPipe(ContentIdParam)) { id }: ContentIdParam,
    @Body(new ParseZodPipe(UpdateContentBody)) body: UpdateContentBody,
    @CurrentUser() user: CurrentUser,
  ) {
    return this.academyService.updateContent(id, {
      ...body,
      updatedBy: user.id,
    });
  }

  @Delete('content/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('academy.manage')
  async deleteContentDraft(
    @Param(new ParseZodPipe(ContentIdParam)) { id }: ContentIdParam,
  ) {
    await this.academyService.deleteContentDraft(id);
  }

  // ==========================================
  // Content Status Transitions
  // ==========================================

  @Post('content/:id/transition')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('academy.manage', 'academy.review', 'academy.publish')
  async transitionContent(
    @Param(new ParseZodPipe(ContentIdParam)) { id }: ContentIdParam,
    @Body(new ParseZodPipe(ContentTransitionBody)) body: ContentTransitionBody,
    @CurrentUser() user: CurrentUser,
  ) {
    if (['review', 'draft'].includes(body.targetStatus)) {
      if (
        !user.permissions.includes('academy.manage') &&
        !user.permissions.includes('academy.review')
      ) {
        throw new ForbiddenException(
          'Izin academy.manage atau academy.review diperlukan untuk aksi ini',
        );
      }
    } else if (body.targetStatus === 'approved') {
      if (!user.permissions.includes('academy.review')) {
        throw new ForbiddenException(
          'Izin editorial/sharia review (academy.review) diperlukan untuk menyetujui materi',
        );
      }
    } else if (['published', 'archived'].includes(body.targetStatus)) {
      if (!user.permissions.includes('academy.publish')) {
        throw new ForbiddenException(
          'Izin publikasi kurikulum (academy.publish) diperlukan untuk memublikasikan atau mengarsipkan materi',
        );
      }
    }

    return this.academyService.transitionContentStatus(
      id,
      body.targetStatus,
      user.id,
      body.rightsConfirmed,
    );
  }

  // ==========================================
  // Media Management
  // ==========================================

  @Put('content/:id/media')
  @RequirePermissions('academy.manage')
  async setLessonMedia(
    @Param(new ParseZodPipe(ContentIdParam)) { id }: ContentIdParam,
    @Body(new ParseZodPipe(SetLessonMediaBody)) body: SetLessonMediaBody,
    @CurrentUser() user: CurrentUser,
  ) {
    return this.academyService.setLessonMedia(id, {
      ...body,
      updatedBy: user.id,
    });
  }

  // ==========================================
  // Entitlements & Grants
  // ==========================================

  @Get('grants')
  @RequirePermissions('academy.manage')
  async getGrants(
    @Query(new ParseZodPipe(AdminGrantsQuery)) query: AdminGrantsQuery,
  ) {
    return this.academyService.getAdminGrants(query);
  }

  @Post('grants')
  @RequirePermissions('academy.manage')
  async createGrant(
    @Body(new ParseZodPipe(CreateGrantBody)) body: CreateGrantBody,
    @CurrentUser() user: CurrentUser,
  ) {
    return this.academyService.createGrant({
      ...body,
      createdBy: user.id,
    });
  }

  @Put('grants/:id/revoke')
  @RequirePermissions('academy.manage')
  async revokeGrant(
    @Param(new ParseZodPipe(GrantIdParam)) { id }: GrantIdParam,
    @CurrentUser() user: CurrentUser,
  ) {
    return this.academyService.revokeGrant(id, user.id);
  }
}
