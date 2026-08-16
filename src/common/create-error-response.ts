import { z } from 'zod';

export function createErrorResponse<
  const Errors extends Record<string, string>,
  const Code extends keyof Errors & string,
  const Details extends z.ZodRawShape | undefined = undefined,
>(errors: Errors, codes: readonly [Code, ...Code[]], details?: Details) {
  const error = codes.length === 1 ? z.literal(codes[0]) : z.enum(codes);
  const messages = codes.map((code) => errors[code]) as [
    Errors[Code],
    ...Errors[Code][],
  ];
  const message =
    messages.length === 1 ? z.literal(messages[0]) : z.enum(messages);

  const response = z.object({
    message,
    error,
  });

  return details ? response.extend({ details: z.object(details) }) : response;
}
