import { z } from 'zod';

export const APP_ERRORS = {
  UNAUTHORIZED: 'Tidak terautentikasi',
  FORBIDDEN: 'Akses ditolak',
  NOT_FOUND: 'Tidak ditemukan',
  INTERNAL_SERVER_ERROR: 'Terjadi kesalahan pada server',
  VALIDATION_FAILED: 'Validasi gagal',
  TOO_MANY_REQUESTS: 'Terlalu banyak permintaan',
  SERVICE_UNAVAILABLE: 'Layanan tidak tersedia',
} as const;

export const UnauthorizedResponse = z.object({
  error: z.literal('UNAUTHORIZED'),
  message: z.literal(APP_ERRORS.UNAUTHORIZED),
});
export type UnauthorizedResponse = z.infer<typeof UnauthorizedResponse>;

export const ForbiddenResponse = z.object({
  error: z.literal('FORBIDDEN'),
  message: z.literal(APP_ERRORS.FORBIDDEN),
});
export type ForbiddenResponse = z.infer<typeof ForbiddenResponse>;

export const NotFoundResponse = z.object({
  error: z.literal('NOT_FOUND'),
  message: z.literal(APP_ERRORS.NOT_FOUND),
});
export type NotFoundResponse = z.infer<typeof NotFoundResponse>;

export const InternalServerErrorResponse = z.object({
  error: z.literal('INTERNAL_SERVER_ERROR'),
  message: z.literal(APP_ERRORS.INTERNAL_SERVER_ERROR),
});
export type InternalServerErrorResponse = z.infer<
  typeof InternalServerErrorResponse
>;

export const TooManyRequestsResponse = z.object({
  error: z.literal('TOO_MANY_REQUESTS'),
  message: z.literal(APP_ERRORS.TOO_MANY_REQUESTS),
});
export type TooManyRequestsResponse = z.infer<typeof TooManyRequestsResponse>;

export const ServiceUnavailableResponse = z.object({
  error: z.literal('SERVICE_UNAVAILABLE'),
  message: z.literal(APP_ERRORS.SERVICE_UNAVAILABLE),
});
export type ServiceUnavailableResponse = z.infer<
  typeof ServiceUnavailableResponse
>;

export const ValidationFailedResponse = z.object({
  error: z.literal('VALIDATION_FAILED'),
  message: z.literal(APP_ERRORS.VALIDATION_FAILED),
  details: z.record(z.string(), z.array(z.string())).meta({
    description: 'Kesalahan validasi per field',
    example: {
      '<field1>': ['<error1>', '<error2>'],
      '<field2>': ['<error1>', '<error2>'],
    },
  }),
});
export type ValidationFailedResponse = z.infer<typeof ValidationFailedResponse>;
