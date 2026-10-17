import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { AcademyAdminController } from './academy-admin.controller';
import type { AcademyService } from './academy.service';
import type { CurrentUser } from '#src/modules/security/current-user.decorator';

describe('AcademyAdminController Editorial Permissions Enforcement', () => {
  let controller: AcademyAdminController;
  let academyServiceMock: Partial<AcademyService>;

  beforeEach(() => {
    academyServiceMock = {
      transitionContentStatus: vi.fn().mockResolvedValue({
        id: 'lesson-1',
        title: 'Test Lesson',
        status: 'approved',
      } as any),
    };

    controller = new AcademyAdminController(academyServiceMock as AcademyService);
  });

  const contentId = { id: 'lesson-1' };

  it('rejects approval transition when user lacks academy.review permission', async () => {
    const authorUser: CurrentUser = {
      id: 'author-uuid',
      role: 'admin',
      permissions: ['academy.manage'] as any,
    };

    await expect(
      controller.transitionContent(
        contentId,
        { targetStatus: 'approved', rightsConfirmed: true },
        authorUser,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(academyServiceMock.transitionContentStatus).not.toHaveBeenCalled();
  });

  it('allows approval transition when user possesses academy.review permission', async () => {
    const reviewerUser: CurrentUser = {
      id: 'reviewer-uuid',
      role: 'admin',
      permissions: ['academy.manage', 'academy.review'] as any,
    };

    const res = await controller.transitionContent(
      contentId,
      { targetStatus: 'approved', rightsConfirmed: true },
      reviewerUser,
    );

    expect(res).toBeDefined();
    expect(academyServiceMock.transitionContentStatus).toHaveBeenCalledWith(
      'lesson-1',
      'approved',
      'reviewer-uuid',
      true,
    );
  });

  it('rejects publish transition when user lacks academy.publish permission', async () => {
    const reviewerUser: CurrentUser = {
      id: 'reviewer-uuid',
      role: 'admin',
      permissions: ['academy.manage', 'academy.review'] as any,
    };

    await expect(
      controller.transitionContent(
        contentId,
        { targetStatus: 'published', rightsConfirmed: true },
        reviewerUser,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(academyServiceMock.transitionContentStatus).not.toHaveBeenCalled();
  });

  it('allows publish transition when user possesses academy.publish permission', async () => {
    const publisherUser: CurrentUser = {
      id: 'publisher-uuid',
      role: 'super_admin',
      permissions: ['academy.manage', 'academy.review', 'academy.publish'] as any,
    };

    const res = await controller.transitionContent(
      contentId,
      { targetStatus: 'published', rightsConfirmed: true },
      publisherUser,
    );

    expect(res).toBeDefined();
    expect(academyServiceMock.transitionContentStatus).toHaveBeenCalledWith(
      'lesson-1',
      'published',
      'publisher-uuid',
      true,
    );
  });

  it('allows draft to review submission with academy.manage permission', async () => {
    const authorUser: CurrentUser = {
      id: 'author-uuid',
      role: 'admin',
      permissions: ['academy.manage'] as any,
    };

    await controller.transitionContent(
      contentId,
      { targetStatus: 'review', rightsConfirmed: false },
      authorUser,
    );

    expect(academyServiceMock.transitionContentStatus).toHaveBeenCalledWith(
      'lesson-1',
      'review',
      'author-uuid',
      false,
    );
  });

  it('allows rejection back to draft by reviewer with academy.review permission', async () => {
    const reviewerUser: CurrentUser = {
      id: 'reviewer-uuid',
      role: 'admin',
      permissions: ['academy.review'] as any,
    };

    await controller.transitionContent(
      contentId,
      { targetStatus: 'draft', rightsConfirmed: false },
      reviewerUser,
    );

    expect(academyServiceMock.transitionContentStatus).toHaveBeenCalledWith(
      'lesson-1',
      'draft',
      'reviewer-uuid',
      false,
    );
  });
});
