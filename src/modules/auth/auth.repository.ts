import { Injectable } from '@nestjs/common';
import { RedisService } from '#src/modules/redis/redis.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly redisService: RedisService) {}

  private otpKey(email: string): string {
    return `otp:${email}`;
  }

  private otpAttemptsKey(email: string): string {
    return `otp_attempts:${email}`;
  }

  private rateLimitKey(email: string): string {
    return `otp_rl:${email}`;
  }

  private sessionKey(userId: string, tokenHash: string): string {
    return `session:${userId}:${tokenHash}`;
  }

  async getOtpHash(email: string): Promise<string | null> {
    return this.redisService.get(this.otpKey(email));
  }

  async saveOtp(
    email: string,
    hash: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redisService.setEx(this.otpKey(email), ttlSeconds, hash);
  }

  async consumeOtp(email: string): Promise<string | null> {
    return this.redisService.getDel(this.otpKey(email));
  }

  async getOtpTtl(email: string): Promise<number> {
    return this.redisService.ttl(this.otpKey(email));
  }

  async incrementOtpAttempts(email: string): Promise<number> {
    return this.redisService.incr(this.otpAttemptsKey(email));
  }

  async setOtpAttemptsTtl(email: string, ttlSeconds: number): Promise<number> {
    return this.redisService.expire(this.otpAttemptsKey(email), ttlSeconds);
  }

  async clearOtpAttempts(email: string): Promise<number> {
    return this.redisService.del(this.otpAttemptsKey(email));
  }

  async clearOtp(email: string): Promise<number> {
    return this.redisService.del(
      this.otpKey(email),
      this.otpAttemptsKey(email),
    );
  }

  async incrementRateLimit(email: string): Promise<number> {
    return this.redisService.incr(this.rateLimitKey(email));
  }

  async setRateLimitTtl(email: string, ttlSeconds: number): Promise<number> {
    return this.redisService.expire(this.rateLimitKey(email), ttlSeconds);
  }

  async getRateLimitTtl(email: string): Promise<number> {
    return this.redisService.ttl(this.rateLimitKey(email));
  }

  async saveSession(
    userId: string,
    tokenHash: string,
    ttlSeconds: number,
    createdAtIso: string,
  ): Promise<void> {
    await this.redisService.setEx(
      this.sessionKey(userId, tokenHash),
      ttlSeconds,
      createdAtIso,
    );
  }

  async getSession(userId: string, tokenHash: string): Promise<string | null> {
    return this.redisService.get(this.sessionKey(userId, tokenHash));
  }

  async extendSession(
    userId: string,
    tokenHash: string,
    ttlSeconds: number,
  ): Promise<number> {
    return this.redisService.expire(
      this.sessionKey(userId, tokenHash),
      ttlSeconds,
    );
  }

  async deleteSession(userId: string, tokenHash: string): Promise<number> {
    return this.redisService.del(this.sessionKey(userId, tokenHash));
  }

  async deleteUserSessions(userId: string): Promise<number> {
    const keys = await this.redisService.scanMatch(`session:${userId}:*`);
    if (!keys.length) return 0;
    return this.redisService.del(...keys);
  }
}
