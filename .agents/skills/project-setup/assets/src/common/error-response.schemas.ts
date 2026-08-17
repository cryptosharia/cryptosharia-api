import { z } from 'zod';

export const APP_ERRORS = {
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Not found',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  VALIDATION_FAILED: 'Validation failed',
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

export const ValidationFailedResponse = z.object({
  error: z.literal('VALIDATION_FAILED'),
  message: z.literal(APP_ERRORS.VALIDATION_FAILED),
  details: z.object({
    root: z.array(z.string()).meta({
      description: 'Root validation errors',
      example: ['<error1>', '<error2>', '<error...>'],
    }),
    fields: z.record(z.string(), z.array(z.string())).meta({
      description: 'Per-field validation errors',
      example: {
        '<field1>': ['<error1>', '<error2>', '<error...>'],
        '<field2>': ['<error1>', '<error2>', '<error...>'],
        '<field...>': ['<error...>'],
      },
    }),
  }),
});
export type ValidationFailedResponse = z.infer<typeof ValidationFailedResponse>;
