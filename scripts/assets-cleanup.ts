import { NestFactory } from '@nestjs/core';
import { z } from 'zod';
import { AppModule } from '#src/app.module';
import { AssetsService } from '#src/modules/assets/assets.service';
import { AssetCleanupOptions } from '#src/modules/assets/assets.schemas';

const CleanupCliOptions = AssetCleanupOptions.extend({
  dryRun: z.boolean().default(true),
});

function parseArgs(args: string[]) {
  const values: Record<string, string | boolean> = {};
  for (const arg of args) {
    if (arg === '--dry-run') values.dryRun = true;
    if (arg === '--execute') values.dryRun = false;
    if (arg.startsWith('--limit=')) values.limit = arg.slice('--limit='.length);
    if (arg.startsWith('--max-age-days=')) {
      values.maxAgeDays = arg.slice('--max-age-days='.length);
    }
  }

  return CleanupCliOptions.parse({
    dryRun: values.dryRun,
    limit: values.limit === undefined ? undefined : Number(values.limit),
    maxAgeDays:
      values.maxAgeDays === undefined ? undefined : Number(values.maxAgeDays),
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const result = await app.get(AssetsService).cleanup(options);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
