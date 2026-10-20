import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  activityLogs,
  websiteSettings,
} from '#src/modules/drizzle/drizzle.schema';
import { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import type { UpdateAcademyVisibilityBody } from './website-settings.schemas';
import { toPublicAcademyVisibility } from './website-settings.schemas';

const SETTINGS_KEY = 'academy_visibility';

@Injectable()
export class WebsiteSettingsService {
  constructor(private readonly drizzleService: DrizzleService) {}

  private async selectSettings() {
    const [settings] = await this.drizzleService.db
      .select()
      .from(websiteSettings)
      .where(eq(websiteSettings.key, SETTINGS_KEY))
      .limit(1);

    if (!settings) {
      throw new InternalServerErrorException(
        'Website settings are not initialized',
      );
    }
    return settings;
  }

  async getPublicAcademyVisibility() {
    const settings = await this.selectSettings();
    return toPublicAcademyVisibility(settings);
  }

  async getAdminAcademyVisibility() {
    const settings = await this.selectSettings();
    return {
      ...toPublicAcademyVisibility(settings),
      version: settings.version,
      updatedAt: settings.updatedAt,
    };
  }

  async updateAcademyVisibility(
    input: UpdateAcademyVisibilityBody,
    actor: { id: string; ipAddress: string },
  ) {
    return this.drizzleService.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(websiteSettings)
        .where(eq(websiteSettings.key, SETTINGS_KEY))
        .for('update')
        .limit(1);

      if (!current) {
        throw new InternalServerErrorException(
          'Website settings are not initialized',
        );
      }
      if (current.version !== input.expectedVersion) {
        throw new ConflictException({
          message:
            'Pengaturan berubah oleh administrator lain. Muat ulang sebelum menyimpan.',
          currentVersion: current.version,
        });
      }

      const previous = {
        academyPromotionEnabled: current.academyPromotionEnabled,
        academyNavbarEnabled: current.academyNavbarEnabled,
        academyHomepageSectionEnabled: current.academyHomepageSectionEnabled,
      };
      const next = {
        academyPromotionEnabled: input.academyPromotionEnabled,
        academyNavbarEnabled: input.academyNavbarEnabled,
        academyHomepageSectionEnabled: input.academyHomepageSectionEnabled,
      };
      const unchanged =
        previous.academyPromotionEnabled === next.academyPromotionEnabled &&
        previous.academyNavbarEnabled === next.academyNavbarEnabled &&
        previous.academyHomepageSectionEnabled ===
          next.academyHomepageSectionEnabled;

      if (unchanged) {
        return {
          ...toPublicAcademyVisibility(current),
          version: current.version,
          updatedAt: current.updatedAt,
        };
      }

      const [updated] = await tx
        .update(websiteSettings)
        .set({
          ...next,
          version: current.version + 1,
          updatedAt: new Date(),
          updatedBy: actor.id,
        })
        .where(
          and(
            eq(websiteSettings.key, SETTINGS_KEY),
            eq(websiteSettings.version, input.expectedVersion),
          ),
        )
        .returning();

      if (!updated) {
        throw new ConflictException(
          'Pengaturan berubah. Muat ulang sebelum menyimpan.',
        );
      }

      // Keep the audit record atomic with the setting change. A failed audit insert
      // aborts the transaction rather than reporting a false successful save.
      await tx.insert(activityLogs).values({
        userId: actor.id,
        action: 'website_settings.academy_visibility.updated',
        subjectType: 'website_settings',
        subjectId: null,
        description: JSON.stringify({
          previous,
          next,
          version: updated.version,
        }),
        ipAddress: actor.ipAddress,
      });

      return {
        ...toPublicAcademyVisibility(updated),
        version: updated.version,
        updatedAt: updated.updatedAt,
      };
    });
  }
}
