import { z } from 'zod';

export const HttpError = z.object({
  statusCode: z.number().int(),
  message: z.string(),
  error: z.string(),
});
export type HttpError = z.infer<typeof HttpError>;

export const HttpValidationError = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.record(z.string(), z.array(z.string())).meta({
    description: 'Fields validation errors',
    example: {
      '<field1>': ['<error1>', '<error2>'],
      '<field2>': ['<error1>', '<error2>'],
    },
  }),
});
export type HttpValidationError = z.infer<typeof HttpValidationError>;
