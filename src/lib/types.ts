import type { InferSelectModel } from 'drizzle-orm';
import * as schema from './server/db/schema';

export type Post = InferSelectModel<typeof schema.posts>;

export type Token = InferSelectModel<typeof schema.tokens>;
