import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { neonConfig, Pool as NeonPool } from '@neondatabase/serverless';
import {
  drizzle as neonDrizzle,
  NeonDatabase,
} from 'drizzle-orm/neon-serverless';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { Pool as PgPool } from 'pg';
import * as schema from './drizzle.schema';

@Injectable()
export class DrizzleService implements OnModuleDestroy {
  public db: NeonDatabase<typeof schema>;
  private pool: NeonPool | PgPool;

  constructor(configService: ConfigService) {
    const connectionString = configService.get<string>('DATABASE_URL')!;

    if (configService.get<boolean>('SERVERLESS') === true) {
      neonConfig.webSocketConstructor = WebSocket;
      this.pool = new NeonPool({ connectionString });
      this.db = neonDrizzle(this.pool, { schema });
    } else {
      this.pool = new PgPool({ connectionString });
      this.db = pgDrizzle(this.pool, { schema });
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
