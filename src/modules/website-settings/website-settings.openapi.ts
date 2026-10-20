import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { createResponsesConfig } from '#src/common/create-responses-config';
import {
  APP_ERRORS,
  ForbiddenResponse,
  UnauthorizedResponse,
  ValidationFailedResponse,
} from '#src/common/error-response.schemas';
import {
  AdminAcademyVisibilityResponse,
  PublicAcademyVisibilityResponse,
  UpdateAcademyVisibilityBody,
} from './website-settings.schemas';

const protectedSecurity: { [key: string]: string[] }[] = [
  { ApiKeyAuth: [], BearerAuth: [] },
];

const commonWriteErrors = {
  422: {
    description: APP_ERRORS.VALIDATION_FAILED,
    body: ValidationFailedResponse,
  },
  401: { description: APP_ERRORS.UNAUTHORIZED, body: UnauthorizedResponse },
  403: { description: APP_ERRORS.FORBIDDEN, body: ForbiddenResponse },
};

export const websiteSettingsRouteConfig: RouteConfig[] = [
  {
    method: 'get',
    path: '/public/site-settings/academy',
    summary: 'Pengaturan tampilan Academy untuk website publik',
    description:
      'Mengembalikan hanya tiga preferensi visibilitas dan hasil efektif. Tidak memuat metadata administrator.',
    responses: createResponsesConfig({
      200: {
        description: 'Pengaturan visibilitas publik',
        body: PublicAcademyVisibilityResponse,
      },
    }),
  },
  {
    method: 'get',
    path: '/admin/site-settings/academy',
    summary: 'Baca pengaturan tampilan Academy',
    description:
      'Membutuhkan bearer token administrator dengan website.settings.manage.',
    security: protectedSecurity,
    responses: createResponsesConfig({
      200: {
        description:
          'Pengaturan Academy beserta version untuk optimistic concurrency',
        body: AdminAcademyVisibilityResponse,
      },
      401: { description: APP_ERRORS.UNAUTHORIZED, body: UnauthorizedResponse },
      403: { description: APP_ERRORS.FORBIDDEN, body: ForbiddenResponse },
    }),
  },
  {
    method: 'put',
    path: '/admin/site-settings/academy',
    summary: 'Simpan pengaturan tampilan Academy',
    description:
      'Menyimpan tiga preferensi secara atomik. expectedVersion mencegah perubahan administrator lain tertimpa.',
    security: protectedSecurity,
    request: {
      body: {
        content: {
          'application/json': { schema: UpdateAcademyVisibilityBody },
        },
      },
    },
    responses: createResponsesConfig({
      200: {
        description: 'Pengaturan berhasil disimpan',
        body: AdminAcademyVisibilityResponse,
      },
      409: {
        description: 'Versi pengaturan sudah berubah',
        body: z.object({
          message: z.string(),
          currentVersion: z.number().int(),
        }),
      },
      ...commonWriteErrors,
    }),
  },
];
