import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import {
  activityLogs,
  users,
  websiteSettings,
} from '#src/modules/drizzle/drizzle.schema';
import { WebsiteSettingsService } from '#src/modules/website-settings/website-settings.service';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error('DATABASE_URL must point to the isolated local QA database.');
const parsedUrl = new URL(databaseUrl);
const databaseName = parsedUrl.pathname.replace(/^\//, '');
if (
  !['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname) ||
  databaseName !== 'cryptosharia_visibility_qa'
) {
  throw new Error(
    'Refusing QA writes: database must be the local cryptosharia_visibility_qa database.',
  );
}

const config = {
  get(name: string) {
    if (name === 'DATABASE_URL') return databaseUrl;
    if (name === 'SERVERLESS') return false;
    return undefined;
  },
} as unknown as ConfigService;

const drizzle = new DrizzleService(config);
const service = new WebsiteSettingsService(drizzle);

async function run() {
  try {
    const [initial] = await drizzle.db.select().from(websiteSettings);
    assert.equal(initial?.key, 'academy_visibility');
    assert.ok(initial);
    if (initial.version === 1) {
      assert.equal(initial.academyPromotionEnabled, true);
      assert.equal(initial.academyNavbarEnabled, true);
      assert.equal(initial.academyHomepageSectionEnabled, true);
    }

    const [actor] = await drizzle.db
      .insert(users)
      .values({
        name: 'Synthetic Visibility QA Admin',
        email: `academy-visibility-qa-${randomUUID()}@example.invalid`,
        role: 'super_admin',
        status: 'active',
      })
      .returning({ id: users.id });
    assert.ok(actor?.id);

    const firstSave = await service.updateAcademyVisibility(
      {
        academyPromotionEnabled: false,
        academyNavbarEnabled: true,
        academyHomepageSectionEnabled: false,
        expectedVersion: initial.version,
      },
      { id: actor.id, ipAddress: '192.0.2.41' },
    );
    assert.equal(firstSave.effectiveNavbar, false);
    assert.equal(firstSave.effectiveSection, false);
    assert.equal(firstSave.version, initial.version + 1);

    const publicState = await service.getPublicAcademyVisibility();
    assert.deepEqual(publicState, {
      academyPromotionEnabled: false,
      academyNavbarEnabled: true,
      academyHomepageSectionEnabled: false,
      effectiveNavbar: false,
      effectiveSection: false,
    });
    assert.equal('version' in publicState, false);
    assert.equal('updatedBy' in publicState, false);

    const concurrentInput = {
      academyPromotionEnabled: true,
      academyNavbarEnabled: false,
      academyHomepageSectionEnabled: true,
      expectedVersion: firstSave.version,
    };
    const concurrent = await Promise.allSettled([
      service.updateAcademyVisibility(concurrentInput, {
        id: actor.id,
        ipAddress: '192.0.2.41',
      }),
      service.updateAcademyVisibility(concurrentInput, {
        id: actor.id,
        ipAddress: '192.0.2.42',
      }),
    ]);
    assert.equal(
      concurrent.filter((result) => result.status === 'fulfilled').length,
      1,
    );
    const rejected = concurrent.find((result) => result.status === 'rejected');
    assert.ok(
      rejected?.status === 'rejected' &&
        rejected.reason instanceof ConflictException,
    );

    const [stored] = await drizzle.db
      .select()
      .from(websiteSettings)
      .where(eq(websiteSettings.key, 'academy_visibility'));
    assert.equal(stored?.version, firstSave.version + 1);
    assert.equal(stored?.academyNavbarEnabled, false);

    const auditRows = await drizzle.db
      .select()
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.userId, actor.id),
          eq(
            activityLogs.action,
            'website_settings.academy_visibility.updated',
          ),
        ),
      );
    assert.equal(auditRows.length, 2);
    assert.equal(
      auditRows.every((row) => row.subjectType === 'website_settings'),
      true,
    );
    console.log(
      'PASS: local QA persistence, sanitization, audit rows, and concurrent version conflict.',
    );
  } finally {
    await drizzle.onModuleDestroy();
  }
}

void run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
