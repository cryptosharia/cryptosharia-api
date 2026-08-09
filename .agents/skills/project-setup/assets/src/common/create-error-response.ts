import { z } from 'zod';

export function createErrorResponse<
  const Errors extends Record<string, string>,
  const Code extends keyof Errors & string,
>(errors: Errors, codes: readonly [Code, ...Code[]]) {
  const error = codes.length === 1 ? z.literal(codes[0]) : z.enum(codes);
  const messages = codes.map((code) => errors[code]) as [
    Errors[Code],
    ...Errors[Code][],
  ];
  const message =
    messages.length === 1 ? z.literal(messages[0]) : z.enum(messages);

  return z.object({
    message,
    error,
  });
}
