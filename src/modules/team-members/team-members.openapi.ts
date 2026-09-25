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
  TeamMemberCreateBody,
  TeamMemberIdParam,
  TeamMemberResponse,
  TeamMembersQuery,
  TeamMemberUpdateBody,
} from './team-members.schemas';

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

export const teamMembersRouteConfig: RouteConfig[] = [
  {
    method: 'get',
    path: '/team-members',
    summary: 'List anggota tim',
    description:
      'Menampilkan daftar anggota tim CryptoSharia dengan search, filter status aktif, sorting, dan pagination.',
    request: { query: TeamMembersQuery },
    responses: createResponsesConfig({
      200: {
        description: 'Daftar anggota tim berhasil ditampilkan',
        body: z.array(TeamMemberResponse),
        headers: { 'total-items': z.string() },
      },
      422: {
        description: APP_ERRORS.VALIDATION_FAILED,
        body: ValidationFailedResponse,
      },
    }),
  },
  {
    method: 'get',
    path: '/team-members/{id}',
    summary: 'Detail anggota tim',
    description: 'Menampilkan detail anggota tim berdasarkan ID atau slug.',
    request: { params: TeamMemberIdParam },
    responses: createResponsesConfig({
      200: {
        description: 'Detail anggota tim berhasil ditampilkan',
        body: TeamMemberResponse,
      },
      404: {
        description: 'Anggota tim tidak ditemukan',
        body: z.object({
          error: z.literal('TEAM_MEMBER_NOT_FOUND'),
          message: z.string(),
        }),
      },
    }),
  },
  {
    method: 'post',
    path: '/team-members',
    summary: 'Tambah anggota tim',
    description: 'Menambahkan anggota tim baru ke CryptoSharia.',
    security: protectedSecurity,
    request: {
      body: {
        content: { 'application/json': { schema: TeamMemberCreateBody } },
      },
    },
    responses: createResponsesConfig({
      201: {
        description: 'Anggota tim berhasil ditambahkan',
        body: TeamMemberResponse,
      },
      409: {
        description: 'Slug sudah digunakan',
        body: z.object({
          error: z.literal('SLUG_ALREADY_EXISTS'),
          message: z.string(),
        }),
      },
      ...commonWriteErrors,
    }),
  },
  {
    method: 'patch',
    path: '/team-members/{id}',
    summary: 'Update anggota tim',
    description: 'Memperbarui data anggota tim yang sudah ada.',
    security: protectedSecurity,
    request: {
      params: TeamMemberIdParam,
      body: {
        content: { 'application/json': { schema: TeamMemberUpdateBody } },
      },
    },
    responses: createResponsesConfig({
      200: {
        description: 'Anggota tim berhasil diperbarui',
        body: TeamMemberResponse,
      },
      404: {
        description: 'Anggota tim tidak ditemukan',
        body: z.object({
          error: z.literal('TEAM_MEMBER_NOT_FOUND'),
          message: z.string(),
        }),
      },
      409: {
        description: 'Slug sudah digunakan',
        body: z.object({
          error: z.literal('SLUG_ALREADY_EXISTS'),
          message: z.string(),
        }),
      },
      ...commonWriteErrors,
    }),
  },
  {
    method: 'delete',
    path: '/team-members/{id}',
    summary: 'Hapus anggota tim',
    description: 'Menghapus anggota tim dari sistem.',
    security: protectedSecurity,
    request: { params: TeamMemberIdParam },
    responses: createResponsesConfig({
      204: { description: 'Anggota tim berhasil dihapus' },
      404: {
        description: 'Anggota tim tidak ditemukan',
        body: z.object({
          error: z.literal('TEAM_MEMBER_NOT_FOUND'),
          message: z.string(),
        }),
      },
      ...commonWriteErrors,
    }),
  },
];
