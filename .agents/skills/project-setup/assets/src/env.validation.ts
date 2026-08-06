import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  JWT_SECRET: z.string(),
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
