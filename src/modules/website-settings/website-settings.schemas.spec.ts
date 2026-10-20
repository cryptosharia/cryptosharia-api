import { describe, expect, it } from 'vitest';
import { ROLE_PERMISSIONS } from '#src/modules/security/permissions';
import {
  toPublicAcademyVisibility,
  UpdateAcademyVisibilityBody,
} from './website-settings.schemas';

describe('Academy visibility settings contract', () => {
  it('applies master visibility without changing the saved child preferences', () => {
    const values = {
      academyPromotionEnabled: false,
      academyNavbarEnabled: true,
      academyHomepageSectionEnabled: false,
    };

    expect(toPublicAcademyVisibility(values)).toEqual({
      ...values,
      effectiveNavbar: false,
      effectiveSection: false,
    });
    expect(values.academyNavbarEnabled).toBe(true);
  });

  it('follows each child preference while the master is enabled', () => {
    for (const academyNavbarEnabled of [false, true]) {
      for (const academyHomepageSectionEnabled of [false, true]) {
        const values = {
          academyPromotionEnabled: true,
          academyNavbarEnabled,
          academyHomepageSectionEnabled,
        };
        expect(toPublicAcademyVisibility(values).effectiveNavbar).toBe(
          academyNavbarEnabled,
        );
        expect(toPublicAcademyVisibility(values).effectiveSection).toBe(
          academyHomepageSectionEnabled,
        );
      }
    }
  });

  it('does not copy database metadata into the public response', () => {
    const databaseRow = {
      academyPromotionEnabled: true,
      academyNavbarEnabled: true,
      academyHomepageSectionEnabled: false,
      key: 'academy_visibility',
      version: 9,
      updatedBy: 'private-user-id',
    };
    const result = toPublicAcademyVisibility(databaseRow);
    expect(result).toEqual({
      academyPromotionEnabled: true,
      academyNavbarEnabled: true,
      academyHomepageSectionEnabled: false,
      effectiveNavbar: true,
      effectiveSection: false,
    });
    expect('updatedBy' in result).toBe(false);
  });

  it('rejects invalid, missing, or extra values instead of coercing them', () => {
    expect(
      UpdateAcademyVisibilityBody.safeParse({
        academyPromotionEnabled: 'false',
        academyNavbarEnabled: true,
        academyHomepageSectionEnabled: true,
        expectedVersion: 1,
      }).success,
    ).toBe(false);
    expect(
      UpdateAcademyVisibilityBody.safeParse({
        academyPromotionEnabled: true,
        academyNavbarEnabled: true,
        expectedVersion: 1,
      }).success,
    ).toBe(false);
    expect(
      UpdateAcademyVisibilityBody.safeParse({
        academyPromotionEnabled: true,
        academyNavbarEnabled: true,
        academyHomepageSectionEnabled: true,
        expectedVersion: 1,
        updatedBy: 'attacker',
      }).success,
    ).toBe(false);
  });

  it('grants the settings permission only to super admins', () => {
    expect(ROLE_PERMISSIONS.super_admin).toContain('website.settings.manage');
    expect(ROLE_PERMISSIONS.admin).not.toContain('website.settings.manage');
    expect(ROLE_PERMISSIONS.posts_manager).not.toContain(
      'website.settings.manage',
    );
  });
});
