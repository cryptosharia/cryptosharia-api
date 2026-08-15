import { Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import { authTokens, refreshTokens } from '#src/modules/drizzle/drizzle.schema';
import type {
  AuthToken,
  DbExecutor,
  RefreshToken,
} from '#src/modules/drizzle/drizzle.types';

@Injectable()
export class AuthRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  transaction<T>(callback: (tx: DbExecutor) => Promise<T>) {
    return this.drizzleService.db.transaction(callback);
  }

  async revokeActiveAuthTokens(
    userId: AuthToken['userId'],
    type: AuthToken['type'],
    now: Date,
    dbExecutor: DbExecutor,
  ): Promise<void> {
    await dbExecutor
      .update(authTokens)
      .set({ revokedAt: now })
      .where(
        and(
          eq(authTokens.userId, userId),
          eq(authTokens.type, type),
          isNull(authTokens.revokedAt),
        ),
      );
  }

  async insertAuthToken(
    input: {
      userId: AuthToken['userId'];
      type: AuthToken['type'];
      tokenHash: AuthToken['tokenHash'];
      expiresAt: AuthToken['expiresAt'];
    },
    dbExecutor: DbExecutor,
  ): Promise<void> {
    await dbExecutor.insert(authTokens).values(input);
  }

  async consumeAuthToken(
    input: { type: AuthToken['type']; tokenHash: string; now: Date },
    dbExecutor: DbExecutor,
  ): Promise<AuthToken | undefined> {
    const [token] = await dbExecutor
      .update(authTokens)
      .set({ revokedAt: input.now })
      .where(
        and(
          eq(authTokens.type, input.type),
          eq(authTokens.tokenHash, input.tokenHash),
          gt(authTokens.expiresAt, input.now),
          isNull(authTokens.revokedAt),
        ),
      )
      .returning();
    return token;
  }

  async insertRefreshToken(
    input: {
      userId: RefreshToken['userId'];
      token: RefreshToken['token'];
      expiresAt: RefreshToken['expiresAt'];
    },
    dbExecutor: DbExecutor,
  ): Promise<void> {
    await dbExecutor.insert(refreshTokens).values(input);
  }

  async consumeRefreshToken(
    input: { tokenHash: string; now: Date },
    dbExecutor: DbExecutor,
  ): Promise<RefreshToken | undefined> {
    const [token] = await dbExecutor
      .update(refreshTokens)
      .set({ revokedAt: input.now })
      .where(
        and(
          eq(refreshTokens.token, input.tokenHash),
          gt(refreshTokens.expiresAt, input.now),
          isNull(refreshTokens.revokedAt),
        ),
      )
      .returning();
    return token;
  }

  async revokeRefreshToken(tokenHash: string, now: Date) {
    const [token] = await this.drizzleService.db
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(
        and(
          eq(refreshTokens.token, tokenHash),
          isNull(refreshTokens.revokedAt),
        ),
      )
      .returning();
    return token;
  }

  async revokeActiveRefreshTokens(
    userId: RefreshToken['userId'],
    now: Date,
    dbExecutor: DbExecutor,
  ): Promise<void> {
    await dbExecutor
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(
        and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)),
      );
  }
}
