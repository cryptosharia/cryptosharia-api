import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    SERVERLESS: z.preprocess((v) => v === 'true', z.boolean()).default(false),
    VERCEL_ENV: z.string().optional(),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.url(),
    OTP_SECRET: z.string().min(1),
    ACCESS_TOKEN_SECRET: z.string().min(1),
    API_KEY: z.string().min(1),
    CMC_API_KEY: z.string().min(1).optional(),
    BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
    VERCEL_BLOB_BASE_URL: z.url().optional(),
    IMGBB_API_KEY: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM: z.string().min(1).optional(),
    RESEND_REPLY_TO: z.email().optional(),
    CONTACT_FORM_TO_EMAIL: z.email().optional(),
    KV_REST_API_URL: z.url().optional(),
    KV_REST_API_TOKEN: z.string().min(1).optional(),
    REDIS_URL: z.url().optional(),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== 'test') {
      const requiredOutsideTest = [
        ['CMC_API_KEY', env.CMC_API_KEY],
        ['BLOB_READ_WRITE_TOKEN', env.BLOB_READ_WRITE_TOKEN],
        ['VERCEL_BLOB_BASE_URL', env.VERCEL_BLOB_BASE_URL],
        ['IMGBB_API_KEY', env.IMGBB_API_KEY],
        ['RESEND_API_KEY', env.RESEND_API_KEY],
        ['RESEND_FROM', env.RESEND_FROM],
        ['CONTACT_FORM_TO_EMAIL', env.CONTACT_FORM_TO_EMAIL],
        ['OTP_SECRET', env.OTP_SECRET],
      ] as const;

      for (const [name, value] of requiredOutsideTest) {
        if (!value) {
          context.addIssue({
            code: 'custom',
            path: [name],
            message: 'Required outside test environment',
          });
        }
      }
    }

    if (env.SERVERLESS !== true && env.NODE_ENV !== 'test' && !env.REDIS_URL) {
      context.addIssue({
        code: 'custom',
        path: ['REDIS_URL'],
        message: 'Required when SERVERLESS is disabled',
      });
    }

    if (env.NODE_ENV !== 'production') return;

    if (!env.KV_REST_API_URL) {
      context.addIssue({
        code: 'custom',
        path: ['KV_REST_API_URL'],
        message: 'Required in production',
      });
    }

    if (!env.KV_REST_API_TOKEN) {
      context.addIssue({
        code: 'custom',
        path: ['KV_REST_API_TOKEN'],
        message: 'Required in production',
      });
    }
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
