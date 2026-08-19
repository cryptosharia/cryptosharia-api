import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis as UpstashRedis } from '@upstash/redis';
import { createClient } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly mode: 'serverless' | 'serverful';
  private readonly serverlessClient?: UpstashRedis;
  private readonly _serverfulClient?: ReturnType<typeof createClient>;
  private connection?: Promise<ReturnType<typeof createClient>>;

  constructor(configService: ConfigService) {
    // Serverless deployments talk to Upstash over REST;
    // everything else uses a direct TCP client against REDIS_URL.
    if (configService.get<boolean>('SERVERLESS') === true) {
      this.mode = 'serverless';
      this.serverlessClient = new UpstashRedis({
        url: configService.getOrThrow<string>('KV_REST_API_URL'),
        token: configService.getOrThrow<string>('KV_REST_API_TOKEN'),
      });
    } else {
      this.mode = 'serverful';
      this._serverfulClient = createClient({
        url: configService.getOrThrow<string>('REDIS_URL'),
      });
    }
  }

  private get serverfulClient(): Promise<ReturnType<typeof createClient>> {
    if (!this._serverfulClient)
      throw new Error('RedisService belum dikonfigurasi untuk mode serverful');
    // Connect lazily so instantiating the service never touches the network.
    // A failed connection is cached, so later commands fail closed too.
    this.connection ??= this._serverfulClient.connect();
    return this.connection;
  }

  async get(key: string): Promise<string | null> {
    if (this.mode === 'serverless') return this.serverlessClient!.get(key);
    return (await this.serverfulClient).get(key);
  }

  async getDel(key: string): Promise<string | null> {
    if (this.mode === 'serverless')
      return this.serverlessClient!.getdel<string>(key);
    return (await this.serverfulClient).getDel(key);
  }

  async setEx(key: string, seconds: number, value: string): Promise<void> {
    if (this.mode === 'serverless') {
      await this.serverlessClient!.setex(key, seconds, value);
      return;
    }
    await (await this.serverfulClient).setEx(key, seconds, value);
  }

  async del(...keys: string[]): Promise<number> {
    if (this.mode === 'serverless') return this.serverlessClient!.del(...keys);
    return (await this.serverfulClient).del(keys);
  }

  async incr(key: string): Promise<number> {
    if (this.mode === 'serverless') return this.serverlessClient!.incr(key);
    return (await this.serverfulClient).incr(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (this.mode === 'serverless')
      return this.serverlessClient!.expire(key, seconds);
    return (await this.serverfulClient).expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    if (this.mode === 'serverless') return this.serverlessClient!.ttl(key);
    return (await this.serverfulClient).ttl(key);
  }

  async scanMatch(pattern: string): Promise<string[]> {
    if (this.mode === 'serverless') {
      const keys: string[] = [];
      let cursor = '0';
      do {
        const [nextCursor, batch] = await this.serverlessClient!.scan(cursor, {
          match: pattern,
          count: 100,
        });
        cursor = nextCursor;
        keys.push(...batch);
      } while (cursor !== '0');
      return keys;
    }

    const client = await this.serverfulClient;
    const keys: string[] = [];
    for await (const batch of client.scanIterator({
      MATCH: pattern,
      COUNT: 100,
    })) {
      keys.push(...batch.map((key) => key.toString()));
    }
    return keys;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.mode !== 'serverful' || !this._serverfulClient) return;
    if (this.connection) await this._serverfulClient.quit();
  }
}
