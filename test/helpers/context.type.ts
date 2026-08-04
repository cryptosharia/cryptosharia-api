import { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { Client } from 'openapi-fetch';
import type { paths } from '#test/schema';

export type TestClient = Client<paths>;
export type Context = {
  app: NestFastifyApplication;
  baseUrl: string;
  client: TestClient;
};
