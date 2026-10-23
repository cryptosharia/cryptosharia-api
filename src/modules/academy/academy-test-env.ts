import { config } from 'dotenv';

config({ path: '.env.test', override: false });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL must target the isolated local test database.');
}

let database: URL;
try {
  database = new URL(databaseUrl);
} catch {
  throw new Error('DATABASE_URL must target the isolated local test database.');
}

const databaseName = decodeURIComponent(database.pathname.slice(1));
if (
  !['postgres:', 'postgresql:'].includes(database.protocol) ||
  !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) ||
  !/(?:^|[_-])(?:test|qa)(?:$|[_-])/i.test(databaseName)
) {
  throw new Error('DATABASE_URL must target the isolated local test database.');
}

process.env.DATABASE_URL = databaseUrl;
process.env.API_KEY = process.env.API_KEY || 'test-bff-api-key-academy-qa-2026';
process.env.ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET ||
  'test-access-token-secret-for-qa-environment-32chars';
process.env.OTP_SECRET =
  process.env.OTP_SECRET || 'test-otp-secret-for-qa-environment-32chars';
process.env.NODE_ENV = 'test';
process.env.SERVERLESS = 'false';
process.env.BLOB_READ_WRITE_TOKEN = 'test-blob-token';
process.env.VERCEL_BLOB_BASE_URL = 'https://test.blob.local';
process.env.IMGBB_API_KEY = 'test-imgbb-key';
process.env.CMC_API_KEY = 'test-cmc-key';
process.env.RESEND_API_KEY = 're_test_mock_resend_api_key';
process.env.RESEND_FROM = 'CryptoSharia <test@example.com>';
process.env.RESEND_REPLY_TO = 'support@example.com';
process.env.CONTACT_FORM_TO_EMAIL = 'support@example.com';
