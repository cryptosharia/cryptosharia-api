import { z } from 'zod';
import { User } from '#src/modules/drizzle/drizzle.types';

const Password = z.string().min(12, 'Password minimal 12 karakter').meta({
  description: 'Minimal 12 karakter.',
  example: 'secure-password',
});
const OpaqueToken = z.string().min(1, 'Token tidak boleh kosong').meta({
  description: 'Token opaque sekali pakai.',
  example: 'opaque-token',
});
const RedirectUrl = z
  .string()
  .refine(
    (value) => {
      if (value.split('{token}').length !== 2) return false;
      try {
        new URL(value.replace('{token}', 'token'));
        return true;
      } catch {
        return false;
      }
    },
    { message: 'URL redirect harus berisi tepat satu placeholder {token}' },
  )
  .meta({
    description: 'URL redirect berisi satu placeholder `{token}`.',
    example: 'https://app.cryptosharia.id/verify/{token}',
  });

export const SignupBody = User.pick({ name: true, email: true }).extend({
  password: Password,
  redirectUrl: RedirectUrl,
});
export type SignupBody = z.infer<typeof SignupBody>;

export const VerifyBody = z.object({ token: OpaqueToken });
export type VerifyBody = z.infer<typeof VerifyBody>;

export const SigninBody = z.object({
  email: User.shape.email,
  password: Password,
});
export type SigninBody = z.infer<typeof SigninBody>;

export const RefreshBody = z.object({ refreshToken: OpaqueToken });
export type RefreshBody = z.infer<typeof RefreshBody>;

export const SignoutBody = z.object({ refreshToken: OpaqueToken });
export type SignoutBody = z.infer<typeof SignoutBody>;

export const ForgotPasswordBody = z.object({
  email: User.shape.email,
  redirectUrl: RedirectUrl,
});
export type ForgotPasswordBody = z.infer<typeof ForgotPasswordBody>;

export const ResetPasswordBody = z.object({
  token: OpaqueToken,
  password: Password,
});
export type ResetPasswordBody = z.infer<typeof ResetPasswordBody>;

export const SessionResponse = z.object({
  accessToken: z.string().meta({
    description: 'Access token JWT (short-lived).',
    example: 'eyJhbGciOiJIUzI1NiIs...',
  }),
  refreshToken: z.string().meta({
    description: 'Refresh token opaque untuk rotasi sesi.',
    example: 'opaque-refresh-token',
  }),
});
export type SessionResponse = z.infer<typeof SessionResponse>;
