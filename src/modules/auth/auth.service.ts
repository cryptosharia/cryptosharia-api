import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { AuditService } from '#src/modules/audit/audit.service';
import { CryptoService } from '#src/modules/crypto/crypto.service';
import type { User } from '#src/modules/drizzle/drizzle.types';
import { MailerService } from '#src/modules/mailer/mailer.service';
import { UsersError } from '#src/modules/users/users.error';
import type { UserResponse } from '#src/modules/users/users.schemas';
import { UsersService } from '#src/modules/users/users.service';
import {
  ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  ACCESS_TOKEN_ISSUER,
  OTP_CODE_LENGTH,
  OTP_MAX_ATTEMPTS,
  OTP_REQUEST_LIMIT,
  OTP_REQUEST_WINDOW_SECONDS,
  OTP_TTL_SECONDS,
  REFRESH_TOKEN_EXPIRES_IN_DAYS,
} from './auth.constants';
import { AuthError } from './auth.error';
import { createOtpEmail } from './auth.helpers';
import { AuthRepository } from './auth.repository';
import type { RefreshResponse, SessionResponse } from './auth.schemas';

function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(OTP_CODE_LENGTH, '0');
}

function emailName(email: string): string {
  const prefix = email.split('@')[0];
  return (prefix || email).slice(0, 120);
}

@Injectable()
export class AuthService {
  private readonly otpSecret: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly cryptoService: CryptoService,
    private readonly mailerService: MailerService,
    private readonly auditService: AuditService,
    private readonly authRepository: AuthRepository,
    configService: ConfigService,
  ) {
    this.otpSecret = configService.getOrThrow<string>('OTP_SECRET');
  }

  private createAccessToken(user: Pick<User, 'id' | 'role'>) {
    return this.cryptoService.signJwt(
      { sub: user.id, role: user.role },
      {
        issuer: ACCESS_TOKEN_ISSUER,
        expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
      },
    );
  }

  private hashOtp(email: string, code: string): string {
    return createHmac('sha256', this.otpSecret)
      .update(`${email}:${code}`)
      .digest('hex');
  }

  private async createSession(
    user: Pick<User, 'id' | 'role'>,
  ): Promise<SessionResponse> {
    const tokenId = this.cryptoService.generateToken();
    await this.authRepository.saveSession(
      user.id,
      this.cryptoService.hashToken(tokenId),
      REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60,
      new Date().toISOString(),
    );
    const accessToken = await this.createAccessToken(user);
    return { accessToken, refreshToken: `${user.id}:${tokenId}` };
  }

  async requestOtp(input: { email: string; ipAddress?: string }) {
    const email = input.email.trim().toLowerCase();

    const requests = await this.authRepository.incrementRateLimit(email);
    if (requests === 1) {
      await this.authRepository.setRateLimitTtl(
        email,
        OTP_REQUEST_WINDOW_SECONDS,
      );
    }
    if (requests > OTP_REQUEST_LIMIT) {
      const ttl = await this.authRepository.getRateLimitTtl(email);
      throw new AuthError('OTP_REQUEST_RATE_LIMITED', {
        retryAfterSeconds: Math.max(ttl, 0),
      });
    }

    const code = generateOtpCode();
    await this.authRepository.saveOtp(
      email,
      this.hashOtp(email, code),
      OTP_TTL_SECONDS,
    );
    await this.authRepository.clearOtpAttempts(email);

    await this.auditService.log({
      action: 'auth.otp.request',
      subjectType: 'auth',
      description: `Kode OTP diminta: ${email}`,
      ipAddress: input.ipAddress,
    });
    try {
      await this.mailerService.send({
        to: email,
        subject: 'Kode Masuk CryptoSharia',
        html: createOtpEmail({ code }),
      });
    } catch {
      // Delivery failure must keep the same response as an unknown email to prevent enumeration.
    }
  }

  async verifyOtp(input: {
    email: string;
    code: string;
    ipAddress?: string;
  }): Promise<SessionResponse> {
    const email = input.email.trim().toLowerCase();

    const expectedHash = await this.authRepository.getOtpHash(email);
    if (!expectedHash) throw new AuthError('OTP_INVALID_OR_EXPIRED');

    const actualHash = this.hashOtp(email, input.code);
    const matches =
      actualHash.length === expectedHash.length &&
      timingSafeEqual(Buffer.from(actualHash), Buffer.from(expectedHash));

    if (!matches) {
      const attempts = await this.authRepository.incrementOtpAttempts(email);
      const ttl = await this.authRepository.getOtpTtl(email);
      if (ttl > 0) await this.authRepository.setOtpAttemptsTtl(email, ttl);
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await this.authRepository.clearOtp(email);
        throw new AuthError('OTP_MAX_ATTEMPTS_EXCEEDED');
      }
      throw new AuthError('OTP_INVALID_OR_EXPIRED', {
        details: { attemptsRemaining: OTP_MAX_ATTEMPTS - attempts },
      });
    }

    await this.authRepository.consumeOtp(email);
    await this.authRepository.clearOtpAttempts(email);

    let user: User;
    try {
      user = await this.usersService.selectByEmail(email);
    } catch (error) {
      if (!(error instanceof UsersError) || error.code !== 'USER_NOT_FOUND')
        throw error;
      try {
        user = await this.usersService.insert({
          name: emailName(email),
          email,
        });
      } catch (insertError) {
        // Concurrent request created the account between lookup and insert.
        if (
          insertError instanceof UsersError &&
          insertError.code === 'EMAIL_UNIQUE_VIOLATION'
        ) {
          user = await this.usersService.selectByEmail(email);
        } else {
          throw insertError;
        }
      }
    }
    if (user.status !== 'active') throw new AuthError('USER_INACTIVE');

    await this.usersService.update(user.id, { lastLoginAt: new Date() });
    await this.auditService.log({
      userId: user.id,
      action: 'auth.otp.verify',
      subjectType: 'auth',
      description: `Login OTP: ${email}`,
      ipAddress: input.ipAddress,
    });

    return this.createSession(user);
  }

  async refresh(input: {
    refreshToken: string;
    ipAddress?: string;
  }): Promise<RefreshResponse> {
    const [userId, tokenId] = input.refreshToken.split(':');
    if (!userId || !tokenId) throw new AuthError('REFRESH_TOKEN_INVALID');

    const tokenHash = this.cryptoService.hashToken(tokenId);
    const session = await this.authRepository.getSession(userId, tokenHash);
    if (!session) throw new AuthError('REFRESH_TOKEN_INVALID');

    let user: UserResponse;
    try {
      user = await this.usersService.selectById(userId);
    } catch (error) {
      if (error instanceof UsersError && error.code === 'USER_NOT_FOUND')
        throw new AuthError('REFRESH_TOKEN_INVALID');
      throw error;
    }
    if (user.status !== 'active') throw new AuthError('USER_INACTIVE');

    await this.authRepository.extendSession(
      userId,
      tokenHash,
      REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60,
    );
    await this.auditService.log({
      userId: user.id,
      action: 'auth.refresh',
      subjectType: 'auth',
      description: 'Sesi diperbarui',
      ipAddress: input.ipAddress,
    });

    return { accessToken: await this.createAccessToken(user) };
  }

  async signout(input: { refreshToken: string; ipAddress?: string }) {
    const [userId, tokenId] = input.refreshToken.split(':');
    // Repeated signout with the same or malformed token stays successful.
    if (!userId || !tokenId) return;

    const removed = await this.authRepository.deleteSession(
      userId,
      this.cryptoService.hashToken(tokenId),
    );
    if (removed) {
      await this.auditService.log({
        userId,
        action: 'auth.signout',
        subjectType: 'auth',
        description: 'Sesi dicabut saat signout',
        ipAddress: input.ipAddress,
      });
    }
  }

  async signoutAll(userId: string) {
    await this.authRepository.deleteUserSessions(userId);
    await this.auditService.log({
      userId,
      action: 'auth.signout-all',
      subjectType: 'auth',
      description: 'Semua sesi dicabut',
    });
  }

  async me(userId: string) {
    let user: UserResponse;
    try {
      user = await this.usersService.selectById(userId);
    } catch (error) {
      if (error instanceof UsersError && error.code === 'USER_NOT_FOUND')
        throw new AuthError('REFRESH_TOKEN_INVALID');
      throw error;
    }
    if (user.status !== 'active') throw new AuthError('USER_INACTIVE');
    return user;
  }
}
