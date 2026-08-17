import { z } from 'zod';

export function createValidationError(
  fields: Record<string, string[]>,
  root: string[] = [],
): z.ZodError {
  const fieldIssues = Object.entries(fields).flatMap(([path, messages]) =>
    messages.map((message) => ({
      code: 'custom' as const,
      path: [path],
      message,
    })),
  );
  const formIssues = root.map((message) => ({
    code: 'custom' as const,
    path: [],
    message,
  }));
  return new z.ZodError([...fieldIssues, ...formIssues]);
}
