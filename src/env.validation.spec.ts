import { describe, expect, it } from 'vitest';
import { validate } from './env.validation';

const production = {
  NODE_ENV: 'production',
  DATABASE_URL: 'https://db.example',
  REDIS_URL: 'redis://localhost:6379',
  OTP_SECRET: 'secret',
  ACCESS_TOKEN_SECRET: 'secret',
  API_KEY: 'secret',
  CMC_API_KEY: 'key',
  BLOB_READ_WRITE_TOKEN: 'token',
  VERCEL_BLOB_BASE_URL: 'https://blob.example',
  IMGBB_API_KEY: 'key',
  RESEND_API_KEY: 'key',
  RESEND_FROM: 'sender',
  CONTACT_FORM_TO_EMAIL: 'contact@example.com',
  PASSWORD_RESET_ADMIN_ORIGIN: 'https://admin.example',
  PASSWORD_RESET_LEARNING_ORIGIN: 'https://learn.example',
};

describe('environment validation', () => {
  it('accepts VPS production without Upstash credentials', () => {
    expect(validate({ ...production, SERVERLESS: 'false' }).SERVERLESS).toBe(
      false,
    );
  });
  it('requires Upstash credentials in serverless production', () => {
    expect(() => validate({ ...production, SERVERLESS: 'true' })).toThrow(
      /KV_REST_API_URL/,
    );
    expect(
      validate({
        ...production,
        SERVERLESS: 'true',
        KV_REST_API_URL: 'https://kv.example',
        KV_REST_API_TOKEN: 'token',
      }).SERVERLESS,
    ).toBe(true);
  });
});

describe('storage environment', () => {
  it('accepts local without Blob credentials and defaults to Blob', () => {
    expect(validate({ ...production }).STORAGE_PROVIDER).toBe('vercel_blob');
    expect(
      validate({
        ...production,
        STORAGE_PROVIDER: 'local',
        STORAGE_LOCAL_ROOT: '/data/media',
        STORAGE_PUBLIC_BASE_URL: 'https://media.example',
        BLOB_READ_WRITE_TOKEN: undefined,
        VERCEL_BLOB_BASE_URL: undefined,
      }).STORAGE_PROVIDER,
    ).toBe('local');
  });
  it('requires the selected provider configuration', () => {
    expect(() =>
      validate({ ...production, BLOB_READ_WRITE_TOKEN: undefined }),
    ).toThrow(/BLOB_READ_WRITE_TOKEN/);
    expect(() =>
      validate({
        ...production,
        STORAGE_PROVIDER: 'local',
        STORAGE_LOCAL_ROOT: 'relative',
        STORAGE_PUBLIC_BASE_URL: 'http://media.example',
      }),
    ).toThrow(/STORAGE_LOCAL_ROOT/);
    expect(() =>
      validate({
        ...production,
        STORAGE_PROVIDER: 'local',
        STORAGE_LOCAL_ROOT: '/media',
        STORAGE_PUBLIC_BASE_URL: 'https://media.example/?x=1',
      }),
    ).toThrow(/STORAGE_PUBLIC_BASE_URL/);
  });
});
