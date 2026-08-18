import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import createClient from 'openapi-fetch';
import type { AddressInfo } from 'node:net';
import { AppModule } from '#src/app.module';
import { MailerService } from '#src/modules/mailer/mailer.service';
import { StorageService } from '#src/modules/storage/storage.service';
import { ImageProviderService } from '#src/modules/image-provider/image-provider.service';
import { MarketDataService } from '#src/modules/market-data/market-data.service';
import type { paths } from '#test/schema';
import type { Context } from './helpers/context.type';
import { resetTestDatabase } from './helpers/reset-test-database';
import { SuitesService } from './suites/index';
import { TestMailerService } from './helpers/test-mailer.service';
import { TestStorageService } from './helpers/test-storage.service';
import { TestImageProviderService } from './helpers/test-image-provider.service';
import { TestMarketDataService } from './helpers/test-market-data.service';

describe('App', () => {
  const ctx = {} as Context;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Capture transactional emails for assertions without network delivery.
      .overrideProvider(MailerService)
      .useClass(TestMailerService)
      // Fake object-storage and image providers so upload tests never hit the network.
      .overrideProvider(StorageService)
      .useClass(TestStorageService)
      .overrideProvider(ImageProviderService)
      .useClass(TestImageProviderService)
      // Fake market-data so quote tests never hit the external provider.
      .overrideProvider(MarketDataService)
      .useClass(TestMarketDataService)
      .compile();

    ctx.app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    // Keep the E2E Fastify instance aligned with the production multipart boundary.
    await ctx.app.register(multipart, {
      limits: { files: 1, fileSize: 32 * 1024 * 1024 },
    });

    await ctx.app.init();
    await ctx.app.listen(0);

    const { port } = ctx.app.getHttpServer().address() as AddressInfo;
    ctx.baseUrl = `http://127.0.0.1:${port}`;
    ctx.client = createClient<paths>({
      baseUrl: ctx.baseUrl,
      headers: { 'api-key': process.env.API_KEY! },
    });
    ctx.clientWithoutApiKey = createClient<paths>({
      baseUrl: ctx.baseUrl,
    });
  });

  beforeEach(async () => {
    // Suites share one application and database, so reset state to keep every case isolated.
    await resetTestDatabase();
    const mailer = ctx.app.get<TestMailerService>(MailerService);
    mailer.clear();
    ctx.app.get<TestStorageService>(StorageService).reset();
    ctx.app.get<TestImageProviderService>(ImageProviderService).reset();
    ctx.app.get<TestMarketDataService>(MarketDataService).reset();
  });

  afterAll(async () => {
    if (ctx.app) await ctx.app.close();
  });

  const suitesService = new SuitesService(ctx);
  suitesService.register();
});
