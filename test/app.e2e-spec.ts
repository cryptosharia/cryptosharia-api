import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import createClient from 'openapi-fetch';
import type { AddressInfo } from 'node:net';
import { AppModule } from '#src/app.module';
import type { paths } from '#test/schema';
import type { Context } from './helpers/context.type';
import { resetTestDatabase } from './helpers/reset-test-database';
import { SuitesService } from './suites/index';

describe('App', () => {
  const ctx = {} as Context;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    ctx.app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    await ctx.app.init();
    await ctx.app.listen(0);

    const { port } = ctx.app.getHttpServer().address() as AddressInfo;
    ctx.baseUrl = `http://127.0.0.1:${port}`;
    ctx.client = createClient<paths>({ baseUrl: ctx.baseUrl });
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const suitesService = new SuitesService(ctx);
  suitesService.register();
});
