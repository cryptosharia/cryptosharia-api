import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@upstash/redis', () => ({ Redis: vi.fn() }));
vi.mock('redis', () => ({ createClient: vi.fn() }));

import { Redis as UpstashRedis } from '@upstash/redis';
import { createClient } from 'redis';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let serverless: Record<string, ReturnType<typeof vi.fn>>;
  let serverful: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    serverless = {
      get: vi.fn().mockResolvedValue('value'),
      getDel: vi.fn().mockResolvedValue('value'),
      setex: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(1),
      ttl: vi.fn().mockResolvedValue(300),
      scan: vi.fn().mockResolvedValue(['0', []]),
    };
    serverful = {
      get: vi.fn().mockResolvedValue('value'),
      getDel: vi.fn().mockResolvedValue('value'),
      setEx: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(1),
      ttl: vi.fn().mockResolvedValue(300),
      scanIterator: vi.fn().mockImplementation(function* () {}),
      quit: vi.fn().mockResolvedValue('OK'),
    };
    serverful.connect = vi.fn().mockResolvedValue(serverful);
    vi.mocked(UpstashRedis).mockImplementation(function (this: unknown) {
      return serverless;
    } as never);
    vi.mocked(createClient).mockReturnValue(serverful as never);
  });

  afterEach(() => vi.clearAllMocks());

  const serverlessConfig = {
    get: vi.fn((key: string) => key === 'SERVERLESS'),
    getOrThrow: vi.fn((key: string) =>
      key === 'KV_REST_API_URL' ? 'https://kv.example' : 'kv-token',
    ),
  };
  const serverfulConfig = {
    get: vi.fn(() => false),
    getOrThrow: vi.fn(() => 'redis://localhost:6379'),
  };

  it('uses the Upstash REST client in serverless mode', () => {
    new RedisService(serverlessConfig as never);

    expect(UpstashRedis).toHaveBeenCalledWith({
      url: 'https://kv.example',
      token: 'kv-token',
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it('uses a TCP client with REDIS_URL in serverful mode and connects lazily', () => {
    const service = new RedisService(serverfulConfig as never);

    expect(createClient).toHaveBeenCalledWith({
      url: 'redis://localhost:6379',
    });
    expect(serverful.connect).not.toHaveBeenCalled();
    expect(service).toBeInstanceOf(RedisService);
  });

  it('delegates commands to the Upstash client in serverless mode', async () => {
    const service = new RedisService(serverlessConfig as never);

    await expect(service.get('key')).resolves.toBe('value');
    await service.setEx('key', 300, 'hash');
    await service.incr('attempts');

    expect(serverless.get).toHaveBeenCalledWith('key');
    expect(serverless.setex).toHaveBeenCalledWith('key', 300, 'hash');
    expect(serverless.incr).toHaveBeenCalledWith('attempts');
  });

  it('connects once and delegates commands to the TCP client in serverful mode', async () => {
    const service = new RedisService(serverfulConfig as never);

    await service.get('key');
    await service.get('key');

    expect(serverful.connect).toHaveBeenCalledTimes(1);
    expect(serverful.get).toHaveBeenCalledTimes(2);
    expect(serverful.get).toHaveBeenCalledWith('key');
  });

  it('collects all keys matching a pattern via SCAN in serverless mode', async () => {
    serverless.scan.mockResolvedValueOnce(['3', ['a', 'b']]);
    serverless.scan.mockResolvedValueOnce(['0', ['c']]);
    const service = new RedisService(serverlessConfig as never);

    await expect(service.scanMatch('session:*')).resolves.toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(serverless.scan).toHaveBeenNthCalledWith(1, '0', {
      match: 'session:*',
      count: 100,
    });
    expect(serverless.scan).toHaveBeenNthCalledWith(2, '3', {
      match: 'session:*',
      count: 100,
    });
  });

  it('collects all keys matching a pattern via scanIterator in serverful mode', async () => {
    serverful.scanIterator.mockImplementation(function* () {
      yield 'session:1:a';
      yield 'session:1:b';
    });
    const service = new RedisService(serverfulConfig as never);

    await expect(service.scanMatch('session:1:*')).resolves.toEqual([
      'session:1:a',
      'session:1:b',
    ]);
    expect(serverful.scanIterator).toHaveBeenCalledWith({
      MATCH: 'session:1:*',
      COUNT: 100,
    });
  });

  it('quits the TCP client on destroy only after a connection was made', async () => {
    const unused = new RedisService(serverfulConfig as never);
    await unused.onModuleDestroy();
    expect(serverful.quit).not.toHaveBeenCalled();

    const used = new RedisService(serverfulConfig as never);
    await used.get('key');
    await used.onModuleDestroy();
    expect(serverful.quit).toHaveBeenCalled();
  });
});
