import { createClient } from 'redis';

export async function resetTestRedis() {
  const client = createClient({ url: process.env.REDIS_URL });
  try {
    await client.connect();
    // The test Redis instance is dedicated, so wiping its keys keeps every case isolated.
    await client.flushDb();
  } finally {
    await client.quit();
  }
}
