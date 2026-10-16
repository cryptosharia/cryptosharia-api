import {
  Body,
  Controller,
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
import { AcademyExceptionFilter } from './academy.exception-filter';
import {
  AuthorizedLessonDetail,
  CatalogQuery,
  CompletionCreateBody,
  CompletionsResponse,
  LessonIdParam,
  LessonIdRouteParam,
  ProgressUpdateBody,
  UserGrantItem,
  UserProgressItem,
  type AcademyCatalogItem,
} from './academy.schemas';
import { AcademyService } from './academy.service';

@Controller('academy')
@UseFilters(AcademyExceptionFilter)
export class AcademyController {
  constructor(private readonly academyService: AcademyService) {}

  // ==========================================
  // Public Metadata Endpoints
  // Protected by global ApiKeyGuard
  // ==========================================

  /**
   * GET /academy/catalog
   * Public published lesson catalog. Structurally omits videoId and editorial notes.
   */
  @Get('catalog')
  async getCatalog(
    @Query(new ParseZodPipe(CatalogQuery)) query: CatalogQuery,
  ): Promise<AcademyCatalogItem[]> {
    const items = await this.academyService.getCatalog(query.scopeId);
    return items.map((item) => ({
      id: item.id,
      kind: item.kind,
      parentId: item.parentId,
      subjectId: item.subjectId,
      level: item.level,
      chapterNumber: item.chapterNumber,
      order: item.order,
      scopeId: item.scopeId,
      title: item.title,
      description: item.description,
      thumbnail: item.thumbnail,
      durationSeconds: item.durationSeconds,
      instructor: item.instructor,
      status: 'published' as const,
      version: item.version,
      publishedAt: item.publishedAt,
    }));
  }

  /**
   * GET /academy/curriculum
   * Published curriculum tree items (subjects, levels, chapters, lessons) for frontend curriculumTree().
   */
  @Get('curriculum')
  async getCurriculum(): Promise<AcademyCatalogItem[]> {
    const items = await this.academyService.getCurriculum();
    return items.map((item) => ({
      id: item.id,
      kind: item.kind,
      parentId: item.parentId,
      subjectId: item.subjectId,
      level: item.level,
      chapterNumber: item.chapterNumber,
      order: item.order,
      scopeId: item.scopeId,
      title: item.title,
      description: item.description,
      thumbnail: item.thumbnail,
      durationSeconds: item.durationSeconds,
      instructor: item.instructor,
      status: 'published' as const,
      version: item.version,
      publishedAt: item.publishedAt,
    }));
  }

  // ==========================================
  // Authorized Participant Endpoints
  // Requires valid Bearer Token & AuthenticationGuard
  // ==========================================

  /**
   * GET /academy/lessons/:id
   * Delivers authorized lesson media including YouTube videoId only to entitled participants.
   */
  @Get('lessons/:id')
  @UseGuards(AuthenticationGuard)
  async getLesson(
    @Param(new ParseZodPipe(LessonIdParam)) { id }: LessonIdParam,
    @CurrentUser() user: CurrentUser,
  ): Promise<AuthorizedLessonDetail> {
    const { lesson, media } =
      await this.academyService.getAuthorizedLessonMedia(user.id, id);

    return {
      lesson: {
        id: lesson.id,
        kind: lesson.kind,
        parentId: lesson.parentId,
        subjectId: lesson.subjectId,
        level: lesson.level,
        chapterNumber: lesson.chapterNumber,
        order: lesson.order,
        scopeId: lesson.scopeId,
        title: lesson.title,
        description: lesson.description,
        thumbnail: lesson.thumbnail,
        durationSeconds: lesson.durationSeconds,
        instructor: lesson.instructor,
        status: 'published',
        version: lesson.version,
        publishedAt: lesson.publishedAt,
      },
      media: {
        videoId: media.videoId,
        version: media.version,
        readingRefs: media.readingRefs ?? [],
        slideRefs: media.slideRefs ?? [],
        subtitleRefs: media.subtitleRefs ?? [],
        attachmentRefs: media.attachmentRefs ?? [],
      },
    };
  }

  /**
   * GET /academy/me/grants
   * Returns current participant's entitlement grants.
   */
  @Get('me/grants')
  @UseGuards(AuthenticationGuard)
  async getMyGrants(
    @CurrentUser() user: CurrentUser,
  ): Promise<UserGrantItem[]> {
    const grants = await this.academyService.getUserGrants(user.id);
    return grants.map((g) => ({
      id: g.id,
      userId: g.userId,
      scopeId: g.scopeId,
      state: g.state,
      startsAt: g.startsAt,
      expiresAt: g.expiresAt,
      source: g.source,
      createdAt: g.createdAt,
    }));
  }

  /**
   * GET /academy/me/progress
   * Returns current participant's video playback resume positions.
   */
  @Get('me/progress')
  @UseGuards(AuthenticationGuard)
  async getMyProgress(
    @CurrentUser() user: CurrentUser,
  ): Promise<UserProgressItem[]> {
    const progressList = await this.academyService.getUserProgress(user.id);
    return progressList.map((p) => ({
      userId: p.userId,
      lessonId: p.lessonId,
      version: p.version,
      positionSeconds: p.positionSeconds,
      updatedAt: p.updatedAt,
    }));
  }

  /**
   * PUT /academy/me/progress/:lessonId
   * Persists participant's bounded playback position. Validates entitlement and published status.
   */
  @Put('me/progress/:lessonId')
  @UseGuards(AuthenticationGuard)
  async updateMyProgress(
    @Param(new ParseZodPipe(LessonIdRouteParam))
    { lessonId }: LessonIdRouteParam,
    @Body(new ParseZodPipe(ProgressUpdateBody)) body: ProgressUpdateBody,
    @CurrentUser() user: CurrentUser,
  ) {
    await this.academyService.recordProgress(
      user.id,
      lessonId,
      body.version,
      body.positionSeconds,
    );
    return {
      success: true,
      lessonId,
      version: body.version,
      positionSeconds: body.positionSeconds,
    };
  }

  /**
   * GET /academy/me/completions
   * Returns current participant's completion records and dynamic aggregate learning progress.
   */
  @Get('me/completions')
  @UseGuards(AuthenticationGuard)
  async getMyCompletions(
    @Query(new ParseZodPipe(CatalogQuery)) query: CatalogQuery,
    @CurrentUser() user: CurrentUser,
  ): Promise<CompletionsResponse> {
    const result = await this.academyService.getCompletionsWithSummary(
      user.id,
      query.scopeId,
    );
    return {
      completions: result.completions.map((c) => ({
        userId: c.userId,
        lessonId: c.lessonId,
        version: c.version,
        completedAt: c.completedAt,
      })),
      summary: result.summary,
    };
  }

  /**
   * POST /academy/me/completions/:lessonId
   * Explicitly marks authoritative published lesson version complete (idempotent, server-timestamped).
   */
  @Post('me/completions/:lessonId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthenticationGuard)
  async markLessonComplete(
    @Param(new ParseZodPipe(LessonIdRouteParam))
    { lessonId }: LessonIdRouteParam,
    @Body(new ParseZodPipe(CompletionCreateBody)) body: CompletionCreateBody,
    @CurrentUser() user: CurrentUser,
  ) {
    await this.academyService.markLessonComplete(
      user.id,
      lessonId,
      body.version,
    );
    return {
      success: true,
      lessonId,
      version: body.version,
    };
  }
}
