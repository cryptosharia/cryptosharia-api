export const TAGS_ERRORS = {
  TAG_NOT_FOUND: 'Tag tidak ditemukan',
  NAME_CONFLICT: 'Nama tag sudah ada',
  SLUG_CONFLICT: 'Slug tag sudah ada',
  TAG_IN_USE: 'Tag masih digunakan oleh post atau token',
} as const;

export type TagsErrorCode = keyof typeof TAGS_ERRORS;

export class TagsError extends Error {
  name = 'TagsError';

  constructor(
    public code: TagsErrorCode,
    public details?: { usage: { posts: number; tokens: number } },
  ) {
    super(TAGS_ERRORS[code]);
  }
}
