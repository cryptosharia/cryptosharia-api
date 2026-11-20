import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimitError } from './rate-limit.error';
import { RateLimitService } from './rate-limit.service';

const mocks = vi.hoisted(() => ({
  limit: vi.fn(),
  redis: vi.fn(),
  limiter: vi.fn(),
}));
vi.mock('@upstash/redis', () => ({ Redis: mocks.redis }));
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(
    vi.fn(function () {
      return { limit: mocks.limit };
    }),
    {
      slidingWindow: mocks.limiter,
    },
  ),
}));

describe('RateLimitService', () => {
  let redis: { evalServerful: ReturnType<typeof vi.fn> };
  const create = (nodeEnv: string, serverless: boolean) => {
    const config = {
      get: vi.fn((key: string) => (key === 'NODE_ENV' ? nodeEnv : serverless)),
      getOrThrow: vi.fn((key: string) =>
        key === 'KV_REST_API_URL' ? 'https://kv.example' : 'token',
      ),
    };
    return {
      service: new RateLimitService(config as never, redis as never),
      config,
    };
  };
  beforeEach(() => {
    redis = { evalServerful: vi.fn() };
  });
  afterEach(() => vi.clearAllMocks());

  it.each(['development', 'test'])('disables limits in %s', async (env) => {
    const { service, config } = create(env, false);
    await expect(service.check('caller')).resolves.toBeUndefined();
    expect(config.getOrThrow).not.toHaveBeenCalled();
    expect(redis.evalServerful).not.toHaveBeenCalled();
  });

  it('uses Upstash in serverless production', async () => {
    const decision = { limit: 100, remaining: 99, reset: 1234, success: true };
    mocks.limit.mockResolvedValueOnce(decision);
    const { service, config } = create('production', true);
    await expect(service.check('caller')).resolves.toEqual(decision);
    expect(config.getOrThrow).toHaveBeenCalledWith('KV_REST_API_URL');
    expect(mocks.limit).toHaveBeenCalledWith('caller');
    expect(redis.evalServerful).not.toHaveBeenCalled();
  });

  it('maps Redis decisions including the 101st request and reset', async () => {
    redis.evalServerful
      .mockResolvedValueOnce([100, 99, 60000, 1])
      .mockResolvedValueOnce([100, 0, 60000, 1])
      .mockResolvedValueOnce([100, 0, 60000, 0])
      .mockResolvedValueOnce([100, 99, 120000, 1]);
    const { service, config } = create('production', false);
    await expect(service.check('caller')).resolves.toEqual({
      limit: 100,
      remaining: 99,
      reset: 60000,
      success: true,
    });
    await expect(service.check('caller')).resolves.toMatchObject({
      remaining: 0,
      success: true,
    });
    await expect(service.check('caller')).resolves.toMatchObject({
      remaining: 0,
      success: false,
    });
    await expect(service.check('caller')).resolves.toMatchObject({
      remaining: 99,
      reset: 120000,
      success: true,
    });
    expect(redis.evalServerful).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('TIME')"),
      [
        expect.stringMatching(/^rate-limit:[a-f0-9]{64}$/),
        expect.stringMatching(/^rate-limit:[a-f0-9]{64}:sequence$/),
      ],
    );
    expect(config.getOrThrow).not.toHaveBeenCalled();
  });

  it('fails closed on Redis failure or invalid response', async () => {
    redis.evalServerful
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(null);
    const { service } = create('production', false);
    await expect(service.check('caller')).rejects.toBeInstanceOf(
      RateLimitError,
    );
    await expect(service.check('caller')).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });

  it('fails closed on Upstash failure', async () => {
    mocks.limit.mockRejectedValueOnce(new Error('offline'));
    await expect(
      create('production', true).service.check('caller'),
    ).rejects.toBeInstanceOf(RateLimitError);
  });
});
