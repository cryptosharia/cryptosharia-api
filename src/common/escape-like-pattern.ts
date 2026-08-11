/**
 * Escapes user input used inside a PostgreSQL LIKE or ILIKE pattern.
 *
 * Parameterized queries prevent SQL injection, but `%` and `_` would still
 * act as wildcards unless they are escaped before the pattern is built.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
