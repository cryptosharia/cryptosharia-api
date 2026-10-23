import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import { spawn } from 'node:child_process';
import { createConnection, type AddressInfo } from 'node:net';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { once } from 'node:events';
import { eq } from 'drizzle-orm';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import { AppModule } from '#src/app.module';
import { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import {
  academyContent,
  academyGrants,
  academyLessonMedia,
  academyScopes,
  users,
} from '#src/modules/drizzle/drizzle.schema';
import { MailerService } from '#src/modules/mailer/mailer.service';
import { StorageService } from '#src/modules/storage/storage.service';
import { ImageProviderService } from '#src/modules/image-provider/image-provider.service';
import { MarketDataService } from '#src/modules/market-data/market-data.service';
import { UsersService } from '#src/modules/users/users.service';
import { TestMailerService } from './helpers/test-mailer.service';
import { TestStorageService } from './helpers/test-storage.service';
import { TestImageProviderService } from './helpers/test-image-provider.service';
import { TestMarketDataService } from './helpers/test-market-data.service';

type LocalViteServer = {
  close: () => Promise<void>;
  listen: () => Promise<void>;
  httpServer: { address: () => AddressInfo | string | null };
};
type LocalViteModule = {
  createServer: (options: {
    configFile: string;
    envDir: string;
    cacheDir: string;
    server: { host: string; port: number; strictPort: boolean };
  }) => Promise<LocalViteServer>;
};

const realBffEnvironment = [
  'ACADEMY_FRONTEND_COPY',
  'ACADEMY_EMPTY_ENV',
  'CS_ADMIN_FRONTEND_COPY',
  'ACADEMY_BROWSER_RUNNER',
  'CS_ADMIN_BROWSER_RUNNER',
  'ACADEMY_REAL_EVIDENCE',
  'ACADEMY_PLAYWRIGHT_MODULE',
];
const realBffEnabled = realBffEnvironment.every((name) => process.env[name]);

describe.skipIf(!realBffEnabled)(
  'Package 3 real API and BFF local integration',
  () => {
    let app: NestFastifyApplication;
    let vite: LocalViteServer;
    let adminVite: LocalViteServer;
    let mailbox: Server;
    let mailer: TestMailerService;
    let apiUrl: string;
    let originalApiBaseUrl: string;
    let mailboxUrl: string;
    let browserUrl: string;
    let adminBrowserUrl: string;
    const apiWorkingDirectory = process.cwd();

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(MailerService)
        .useClass(TestMailerService)
        .overrideProvider(StorageService)
        .useClass(TestStorageService)
        .overrideProvider(ImageProviderService)
        .useClass(TestImageProviderService)
        .overrideProvider(MarketDataService)
        .useClass(TestMarketDataService)
        .compile();

      app = moduleRef.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );
      await app.register(multipart, {
        limits: { files: 1, fileSize: 32 * 1024 * 1024 },
      });
      await app.init();
      await app.listen(0, '127.0.0.1');
      const apiPort = (app.getHttpServer().address() as AddressInfo).port;
      apiUrl = `http://127.0.0.1:${apiPort}`;
      mailer = app.get<TestMailerService>(MailerService);

      const db = app.get(DrizzleService).db;
      const now = new Date();
      await db.insert(academyScopes).values({
        id: 'scope-package3-real',
        name: 'Paket sintetis Package 3',
        description: 'Fixture database lokal',
        isActive: true,
      });
      await db.insert(academyContent).values([
        {
          id: 'fundamental',
          kind: 'subject',
          parentId: 'root',
          subjectId: 'fundamental',
          level: 1,
          chapterNumber: 1,
          order: 0,
          title: 'Analisis Fundamental',
          status: 'published',
          version: 1,
          publishedAt: now,
        },
        {
          id: 'level-package3-real',
          kind: 'level',
          parentId: 'fundamental',
          subjectId: 'fundamental',
          level: 1,
          chapterNumber: 1,
          order: 1,
          scopeId: 'scope-package3-real',
          title: 'Level sintetis Package 3',
          status: 'published',
          version: 1,
          publishedAt: now,
        },
        {
          id: 'chapter-package3-real',
          kind: 'chapter',
          parentId: 'level-package3-real',
          subjectId: 'fundamental',
          level: 1,
          chapterNumber: 1,
          order: 1,
          scopeId: 'scope-package3-real',
          title: 'Bab sintetis Package 3',
          status: 'published',
          version: 1,
          publishedAt: now,
        },
        {
          id: 'lesson-package3-real',
          kind: 'lesson',
          parentId: 'chapter-package3-real',
          subjectId: 'fundamental',
          level: 1,
          chapterNumber: 1,
          order: 1,
          scopeId: 'scope-package3-real',
          title: 'Pelajaran sintetis API Package 3',
          description: 'Video pengujian lokal',
          durationSeconds: 120,
          instructor: 'Peserta sintetis',
          status: 'published',
          version: 1,
          publishedAt: now,
        },
      ]);
      await db.insert(academyLessonMedia).values({
        lessonId: 'lesson-package3-real',
        videoId: 'abcdefghijk',
        version: 1,
        internalNote: 'Private synthetic fixture',
      });

      const handleMailboxRequest = async (
        req: IncomingMessage,
        res: ServerResponse,
      ) => {
        const reply = (status: number, data?: unknown) => {
          res.writeHead(status, { 'content-type': 'application/json' });
          res.end(data === undefined ? undefined : JSON.stringify(data));
        };
        try {
          if (req.method === 'POST' && req.url === '/offline') {
            const closedPortProbe = createServer();
            await new Promise<void>((resolveListen, reject) => {
              closedPortProbe.once('error', reject);
              closedPortProbe.listen(0, '127.0.0.1', resolveListen);
            });
            const probeAddress = closedPortProbe.address() as AddressInfo;
            await new Promise<void>((resolveClose) =>
              closedPortProbe.close(() => resolveClose()),
            );
            await new Promise<void>((resolveClosed, rejectClosed) => {
              const connection = createConnection({
                host: '127.0.0.1',
                port: probeAddress.port,
              });
              connection.once('connect', () => {
                connection.destroy();
                rejectClosed(
                  new Error('The API outage probe port accepted a connection.'),
                );
              });
              connection.once('error', (error: NodeJS.ErrnoException) => {
                if (error.code === 'ECONNREFUSED') resolveClosed();
                else rejectClosed(error);
              });
              connection.setTimeout(2_000, () => {
                connection.destroy();
                rejectClosed(
                  new Error(
                    'The API outage probe did not refuse a connection.',
                  ),
                );
              });
            });
            process.env.API_BASE_URL = `http://127.0.0.1:${probeAddress.port}`;
            return reply(200, {
              state: 'offline',
              target: 'closed-loopback-port',
            });
          }
          if (req.method === 'POST' && req.url === '/online') {
            process.env.API_BASE_URL = originalApiBaseUrl;
            return reply(200, { state: 'online', target: 'local-test-api' });
          }
          if (req.method === 'GET' && req.url === '/latest') {
            const match = mailer.messages.at(-1)?.html.match(/(\d{6})/);
            if (!match) return reply(404, { error: 'NO_SYNTHETIC_OTP' });
            return reply(200, { code: match[1] });
          }
          if (req.method === 'GET' && req.url === '/latest-reset') {
            const match = mailer.messages
              .at(-1)
              ?.html.match(/\/auth\/reset-password\/([A-Za-z0-9_-]{43})/);
            if (!match) return reply(404, { error: 'NO_SYNTHETIC_RESET_LINK' });
            return reply(200, { token: match[1] });
          }
          if (req.method === 'POST' && req.url === '/grant') {
            let body = '';
            for await (const chunk of req) body += chunk;
            const { email } = JSON.parse(body) as { email: string };
            const user = await app.get(UsersService).selectByEmail(email);
            await app
              .get(DrizzleService)
              .db.insert(academyGrants)
              .values({
                userId: user.id,
                scopeId: 'scope-package3-real',
                state: 'active',
                startsAt: new Date(Date.now() - 60_000),
                expiresAt: new Date(Date.now() + 86_400_000),
                source: 'manual',
              });
            res.writeHead(204);
            return res.end();
          }
          return reply(404, { error: 'NOT_FOUND' });
        } catch {
          return reply(500, { error: 'LOCAL_TEST_HARNESS_FAILED' });
        }
      };
      mailbox = createServer((req, res) => {
        void handleMailboxRequest(req, res);
      });
      await new Promise<void>((resolveListen) =>
        mailbox.listen(0, '127.0.0.1', resolveListen),
      );
      mailboxUrl = `http://127.0.0.1:${(mailbox.address() as AddressInfo).port}`;

      const frontendRoot = resolve(process.env.ACADEMY_FRONTEND_COPY!);
      const emptyEnv = resolve(process.env.ACADEMY_EMPTY_ENV!);
      const viteModule = (await import(
        pathToFileURL(
          join(frontendRoot, 'node_modules/vite/dist/node/index.js'),
        ).href
      )) as unknown as LocalViteModule;
      for (const key of Object.keys(process.env)) {
        if (key.startsWith('PUBLIC_FIREBASE_')) delete process.env[key];
      }
      Object.assign(process.env, {
        PUBLIC_ACADEMY_ENABLED: 'true',
        PUBLIC_ACADEMY_BACKEND: 'api',
        PUBLIC_FIREBASE_MODE: 'disabled',
        API_BASE_URL: apiUrl,
        API_KEY: process.env.API_KEY,
      });
      originalApiBaseUrl = apiUrl;
      process.chdir(frontendRoot);
      vite = await viteModule.createServer({
        configFile: join(frontendRoot, 'vite.config.ts'),
        envDir: emptyEnv,
        cacheDir: resolve(
          process.env.ACADEMY_VITE_CACHE_DIR ||
            join(frontendRoot, '.vite-cache'),
        ),
        server: { host: '127.0.0.1', port: 0, strictPort: false },
      });
      await vite.listen();
      const viteAddress = vite.httpServer.address();
      if (!viteAddress || typeof viteAddress === 'string') {
        throw new Error('The local Vite server has no TCP port.');
      }
      browserUrl = `http://127.0.0.1:${viteAddress.port}`;

      const adminRoot = resolve(process.env.CS_ADMIN_FRONTEND_COPY!);
      const adminViteModule = (await import(
        pathToFileURL(join(adminRoot, 'node_modules/vite/dist/node/index.js'))
          .href
      )) as unknown as LocalViteModule;
      Object.assign(process.env, {
        PUBLIC_CS_API_URL: apiUrl,
        CS_API_KEY: process.env.API_KEY,
      });
      process.chdir(adminRoot);
      adminVite = await adminViteModule.createServer({
        configFile: join(adminRoot, 'vite.config.ts'),
        envDir: emptyEnv,
        cacheDir: resolve(
          process.env.CS_ADMIN_VITE_CACHE_DIR || join(adminRoot, '.vite-cache'),
        ),
        server: { host: '127.0.0.1', port: 0, strictPort: false },
      });
      await adminVite.listen();
      const adminViteAddress = adminVite.httpServer.address();
      if (!adminViteAddress || typeof adminViteAddress === 'string') {
        throw new Error('The local Admin Vite server has no TCP port.');
      }
      adminBrowserUrl = `http://127.0.0.1:${adminViteAddress.port}`;
      let adminReady = false;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          const response = await fetch(`${adminBrowserUrl}/login`, {
            signal: AbortSignal.timeout(15_000),
          });
          await response.arrayBuffer();
          if (response.status < 500) {
            adminReady = true;
            break;
          }
        } catch {
          // Vite may restart once while it optimizes the cold dependency cache.
        }
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000));
      }
      if (!adminReady)
        throw new Error('The local Admin login route did not become ready.');
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 2_000));
    }, 180_000);

    afterAll(async () => {
      process.env.API_BASE_URL = originalApiBaseUrl;
      mailbox?.close();
      if (adminVite) await adminVite.close();
      if (vite) await vite.close();
      process.chdir(apiWorkingDirectory);
      if (app) await app.close();
    }, 30_000);

    it('verifies real API OTP, BFF flows, controlled outage, account isolation, and logout in browser', async () => {
      const frontendRoot = resolve(process.env.ACADEMY_FRONTEND_COPY!);
      const browserRunner = resolve(process.env.ACADEMY_BROWSER_RUNNER!);
      const evidence = resolve(process.env.ACADEMY_REAL_EVIDENCE!);
      const allowedEnv = {
        PATH: process.env.PATH,
        SYSTEMROOT: process.env.SYSTEMROOT,
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
        USERPROFILE: process.env.USERPROFILE,
        APPDATA: process.env.APPDATA,
        LOCALAPPDATA: process.env.LOCALAPPDATA,
        NODE_ENV: 'test',
        API_KEY: process.env.API_KEY,
        PUBLIC_ACADEMY_ENABLED: 'true',
        PUBLIC_ACADEMY_BACKEND: 'api',
        PUBLIC_FIREBASE_MODE: 'disabled',
        ACADEMY_FRONTEND_ROOT: frontendRoot,
        ACADEMY_FRONTEND_URL: browserUrl,
        ACADEMY_TEST_MAILBOX_URL: mailboxUrl,
        ACADEMY_PLAYWRIGHT_MODULE: process.env.ACADEMY_PLAYWRIGHT_MODULE,
        ACADEMY_CHROME_EXECUTABLE: process.env.ACADEMY_CHROME_EXECUTABLE,
        ACADEMY_BROWSER_EVIDENCE_DIR: evidence,
      } as NodeJS.ProcessEnv;
      const child = spawn(process.execPath, [browserRunner], {
        cwd: frontendRoot,
        env: allowedEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      child.stdout?.setEncoding('utf8').on('data', (chunk: string) => {
        stdout += chunk;
        process.stdout.write(chunk);
      });
      child.stderr?.setEncoding('utf8').on('data', (chunk: string) => {
        process.stderr.write(chunk);
      });
      const [code] = (await once(child, 'close')) as [number | null];
      expect(code).toBe(0);
      expect(stdout.match(/^PASS /gm)).toHaveLength(8);

      const db = app.get(DrizzleService).db;
      const [sharedUser] = await db
        .update(users)
        .set({ role: 'admin' })
        .where(eq(users.email, 'qa-password@example.test'))
        .returning({ id: users.id });
      expect(sharedUser).toBeDefined();

      const adminRoot = resolve(process.env.CS_ADMIN_FRONTEND_COPY!);
      const adminBrowserRunner = resolve(process.env.CS_ADMIN_BROWSER_RUNNER!);
      const adminChild = spawn(process.execPath, [adminBrowserRunner], {
        cwd: adminRoot,
        env: {
          PATH: process.env.PATH,
          SYSTEMROOT: process.env.SYSTEMROOT,
          TEMP: process.env.TEMP,
          TMP: process.env.TMP,
          USERPROFILE: process.env.USERPROFILE,
          APPDATA: process.env.APPDATA,
          LOCALAPPDATA: process.env.LOCALAPPDATA,
          NODE_ENV: 'test',
          ADMIN_FRONTEND_URL: adminBrowserUrl,
          CROSS_APP_EMAIL: 'qa-password@example.test',
          CROSS_APP_PASSWORD: 'Different reset password 2026!',
          PLAYWRIGHT_MODULE: process.env.ACADEMY_PLAYWRIGHT_MODULE,
          CHROME_EXECUTABLE: process.env.ACADEMY_CHROME_EXECUTABLE,
          API_KEY: process.env.API_KEY,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let adminStdout = '';
      adminChild.stdout?.setEncoding('utf8').on('data', (chunk: string) => {
        adminStdout += chunk;
        process.stdout.write(chunk);
      });
      adminChild.stderr?.setEncoding('utf8').on('data', (chunk: string) => {
        process.stderr.write(chunk);
      });
      const [adminCode] = (await once(adminChild, 'close')) as [number | null];
      expect(adminCode).toBe(0);
      expect(adminStdout.match(/^PASS /gm)).toHaveLength(4);
    }, 240_000);
  },
);
