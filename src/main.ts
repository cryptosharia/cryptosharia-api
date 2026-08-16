import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import { FastifyRequest, FastifyReply } from 'fastify';
import { join } from 'node:path';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  // Cap multipart buffering at the largest endpoint limit before request handlers run.
  await app.register(multipart, {
    limits: { files: 1, fileSize: 32 * 1024 * 1024 },
  });

  app.use((req: FastifyRequest, _res: FastifyReply, next: () => void) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
  });

  app.useStaticAssets({
    root: join(process.cwd(), 'static'),
    prefix: '/',
  });

  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

bootstrap().catch(console.error);
