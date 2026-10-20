import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import { WebsiteSettingsService } from './website-settings.service';

const baseSettings = {
  key: 'academy_visibility',
  academyPromotionEnabled: true,
  academyNavbarEnabled: true,
  academyHomepageSectionEnabled: true,
  version: 4,
  updatedAt: new Date('2026-10-01T00:00:00.000Z'),
  updatedBy: null,
};

function makeService(current = baseSettings) {
  const insertValues = vi.fn().mockResolvedValue(undefined);
  const updateReturning = vi.fn(async () => [
    {
      ...current,
      academyPromotionEnabled: false,
      version: current.version + 1,
      updatedAt: new Date('2026-10-02T00:00:00.000Z'),
      updatedBy: 'actor-1',
    },
  ]);
  const updateWhere = vi.fn(() => ({ returning: updateReturning }));
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const tx = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          for: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([current]) })),
        })),
      })),
    })),
    update: vi.fn(() => ({ set: updateSet })),
    insert: vi.fn(() => ({ values: insertValues })),
  };
  const transaction = vi.fn(async (work: (executor: typeof tx) => unknown) =>
    work(tx),
  );
  const service = new WebsiteSettingsService({
    db: { transaction },
  } as unknown as DrizzleService);
  return { service, transaction, tx, insertValues, updateSet, updateReturning };
}

describe('WebsiteSettingsService', () => {
  it('writes changed values and audit data within one transaction', async () => {
    const { service, transaction, insertValues, updateSet } = makeService();
    const result = await service.updateAcademyVisibility(
      {
        academyPromotionEnabled: false,
        academyNavbarEnabled: true,
        academyHomepageSectionEnabled: true,
        expectedVersion: 4,
      },
      { id: 'actor-1', ipAddress: '192.0.2.1' },
    );

    expect(transaction).toHaveBeenCalledOnce();
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        academyPromotionEnabled: false,
        version: 5,
        updatedBy: 'actor-1',
      }),
    );
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'actor-1',
        action: 'website_settings.academy_visibility.updated',
        subjectType: 'website_settings',
        ipAddress: '192.0.2.1',
        description: expect.stringContaining('academyPromotionEnabled'),
      }),
    );
    expect(result).toMatchObject({
      academyPromotionEnabled: false,
      effectiveNavbar: false,
      effectiveSection: false,
      version: 5,
    });
  });

  it('rejects a stale administrator version before writing', async () => {
    const { service, tx, updateSet } = makeService();
    await expect(
      service.updateAcademyVisibility(
        {
          academyPromotionEnabled: false,
          academyNavbarEnabled: true,
          academyHomepageSectionEnabled: true,
          expectedVersion: 3,
        },
        { id: 'actor-2', ipAddress: '192.0.2.2' },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
    expect(updateSet).not.toHaveBeenCalled();
  });

  it('does not increment the version or create an audit row for an unchanged save', async () => {
    const { service, tx } = makeService();
    const result = await service.updateAcademyVisibility(
      {
        academyPromotionEnabled: true,
        academyNavbarEnabled: true,
        academyHomepageSectionEnabled: true,
        expectedVersion: 4,
      },
      { id: 'actor-1', ipAddress: '192.0.2.1' },
    );

    expect(result.version).toBe(4);
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('propagates audit failures so the surrounding transaction can roll back', async () => {
    const { service, transaction, tx } = makeService();
    vi.mocked(tx.insert).mockImplementation(
      () =>
        ({
          values: vi.fn().mockRejectedValue(new Error('audit unavailable')),
        }) as never,
    );

    await expect(
      service.updateAcademyVisibility(
        {
          academyPromotionEnabled: false,
          academyNavbarEnabled: true,
          academyHomepageSectionEnabled: true,
          expectedVersion: 4,
        },
        { id: 'actor-1', ipAddress: '192.0.2.1' },
      ),
    ).rejects.toThrow('audit unavailable');
    expect(transaction).toHaveBeenCalledOnce();
  });
});
