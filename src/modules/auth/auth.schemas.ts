import { z } from 'zod';
import { User } from '#src/modules/drizzle/drizzle.types';

const Password = z.string().min(12).meta({
  description: 'Password with at least 12 characters.',
  example: 'secure-password',
});
const OpaqueToken = z.string().min(1).meta({
  description: 'Opaque single-use token.',
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
    { message: 'Redirect URL must contain exactly one {token} placeholder' },
  )
  .meta({
    description: 'Redirect URL containing exactly one `{token}` placeholder.',
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
    description: 'Short-lived JWT access token.',
    example: 'eyJhbGciOiJIUzI1NiIs...',
  }),
  refreshToken: z.string().meta({
    description: 'Opaque refresh token used to rotate the session.',
    example: 'opaque-refresh-token',
  }),
});
export type SessionResponse = z.infer<typeof SessionResponse>;
