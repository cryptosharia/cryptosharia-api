export const POSTS_ERRORS = {
  POST_NOT_FOUND: 'Post tidak ditemukan',
  SLUG_CONFLICT: 'Slug sudah ada',
} as const;

export type PostsErrorCode = keyof typeof POSTS_ERRORS;

export class PostsError extends Error {
  name = 'PostsError';

  constructor(public code: PostsErrorCode) {
    super(POSTS_ERRORS[code]);
  }
}
