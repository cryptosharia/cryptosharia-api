import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { authRoutes } from '../auth';
import { usersRoutes } from '../users';
import { postsRoutes } from '../posts';
import { tokensRoutes } from '../tokens';
import { tagsRoutes } from '../tags';
import { messagesRoutes } from '../messages';
import { imgbbRoutes } from '../imgbb';
import { assetsRoutes } from '../assets';
import { seedRoutes } from '../seed';
import { opsAssetsCleanupRoutes } from '../ops/assets/cleanup';
import { docsRoutes } from '../(docs)';
import { openapiRoutes } from '.';

export const ROUTE_REGISTRY: RouteConfig[] = [
	...docsRoutes,
	...openapiRoutes,
	...authRoutes,
	...usersRoutes,
	...postsRoutes,
	...tokensRoutes,
	...tagsRoutes,
	...messagesRoutes,
	...imgbbRoutes,
	...assetsRoutes,
	...opsAssetsCleanupRoutes,
	...seedRoutes
];
