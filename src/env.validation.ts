import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  JWT_SECRET: z.string(),
  OTP_SECRET: z.string(),
  REFRESH_TOKEN_SECRET: z.string(),
  API_KEY: z.string(),
  BLOB_READ_WRITE_TOKEN: z.string(),
  VERCEL_BLOB_BASE_URL: z.string(),
  RESEND_API_KEY: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
});

export function validate(config: Record<string, unknown>) {
  try {
    return envSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Missing or invalid environment variables: ${JSON.stringify(z.flattenError(error).fieldErrors, null, 2)}`,
      );
    }
    throw error;
  }
}
