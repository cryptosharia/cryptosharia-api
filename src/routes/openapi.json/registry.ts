import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { authRoutes } from '../auth';
import { usersRoutes } from '../users';
import { postsRoutes } from '../posts';
import { tokensRoutes } from '../tokens';
import { messagesRoutes } from '../messages';
import { imgbbRoutes } from '../imgbb';
import { seedRoutes } from '../seed';
import { docsRoutes } from '../(docs)';
import { openapiRoutes } from '.';

export const ROUTE_REGISTRY: RouteConfig[] = [
	...docsRoutes,
	...openapiRoutes,
	...authRoutes,
	...usersRoutes,
	...postsRoutes,
	...tokensRoutes,
	...messagesRoutes,
	...imgbbRoutes,
	...seedRoutes
];
