import { z } from 'zod';
import { User } from '#src/modules/drizzle/drizzle.types';

const RefreshToken = z.string().min(1, 'Tidak boleh kosong').meta({
  description: 'Refresh token (`{userId}:{tokenId}`)',
  example: '0d53e95e-9ac5-41e1-b8d7-9c7f2a3b4c5d:a1b2c3d4...',
});

const AccessToken = z.string().meta({
  description: 'Access token JWT (short-lived)',
  example: 'eyJhbGciOiJIUzI1NiIs...',
});

const OtpCode = z
  .string()
  .regex(/^\d{6}$/, 'Harus 6 digit angka')
  .meta({
    description: 'Kode OTP 6 digit',
    example: '123456',
  });

export const OtpRequestBody = z.object({
  email: User.shape.email,
});
export type OtpRequestBody = z.infer<typeof OtpRequestBody>;

export const OtpVerifyBody = z.object({
  email: User.shape.email,
  code: OtpCode,
});
export type OtpVerifyBody = z.infer<typeof OtpVerifyBody>;

export const RefreshBody = z.object({ refreshToken: RefreshToken });
export type RefreshBody = z.infer<typeof RefreshBody>;

export const SignoutBody = z.object({ refreshToken: RefreshToken });
export type SignoutBody = z.infer<typeof SignoutBody>;

export const SessionResponse = z.object({
  accessToken: AccessToken,
  refreshToken: RefreshToken,
});
export type SessionResponse = z.infer<typeof SessionResponse>;

export const RefreshResponse = z.object({
  accessToken: AccessToken,
});
export type RefreshResponse = z.infer<typeof RefreshResponse>;

export const OtpInvalidDetails = z.object({
  attemptsRemaining: z.number().meta({
    description: 'Sisa percobaan',
  }),
});
export type OtpInvalidDetails = z.infer<typeof OtpInvalidDetails>;

export const RetryAfterHeader = z.string().meta({
  description: 'Detik sebelum request berikutnya',
});
