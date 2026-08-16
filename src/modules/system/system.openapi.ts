import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { createResponsesConfig } from '#src/common/create-responses-config';

export const systemRouteConfig: RouteConfig[] = [
  {
    method: 'get',
    path: '/health',
    summary: 'Health check',
    description: 'Cek status API.',
    responses: createResponsesConfig({
      200: {
        description: 'API tersedia',
        body: z.object({ status: z.literal('UP') }),
      },
    }),
  },
];
