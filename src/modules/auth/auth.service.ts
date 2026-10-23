import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';
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
  PASSWORD_LOGIN_ACCOUNT_LIMIT,
  PASSWORD_LOGIN_IP_LIMIT,
  PASSWORD_LOGIN_WINDOW_SECONDS,
  PASSWORD_RESET_IP_LIMIT,
  PASSWORD_RESET_REQUEST_LIMIT,
  PASSWORD_RESET_TOKEN_TTL_SECONDS,
  PASSWORD_RESET_WINDOW_SECONDS,
  REFRESH_TOKEN_EXPIRES_IN_DAYS,
} from './auth.constants';
import { AuthError } from './auth.error';
import { createOtpEmail, createPasswordResetEmail } from './auth.helpers';
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
  private readonly passwordResetAdminOrigin?: string;
  private readonly passwordResetLearningOrigin?: string;
  private dummyPasswordHash?: Promise<string>;

  constructor(
    private readonly usersService: UsersService,
    private readonly cryptoService: CryptoService,
    private readonly mailerService: MailerService,
    private readonly auditService: AuditService,
    private readonly authRepository: AuthRepository,
    configService: ConfigService,
  ) {
    this.otpSecret = configService.getOrThrow<string>('OTP_SECRET');
    this.passwordResetAdminOrigin = configService.get<string>(
      'PASSWORD_RESET_ADMIN_ORIGIN',
    );
    this.passwordResetLearningOrigin = configService.get<string>(
      'PASSWORD_RESET_LEARNING_ORIGIN',
    );
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

  private async verifyOtpCode(email: string, code: string): Promise<void> {
    const expectedHash = await this.authRepository.getOtpHash(email);
    if (!expectedHash) throw new AuthError('OTP_INVALID_OR_EXPIRED');

    const actualHash = this.hashOtp(email, code);
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

    // getDel makes the proof single-use even when two requests race.
    const consumedHash = await this.authRepository.consumeOtp(email);
    if (consumedHash !== expectedHash)
      throw new AuthError('OTP_INVALID_OR_EXPIRED');
    await this.authRepository.clearOtpAttempts(email);
  }

  private getDummyPasswordHash(): Promise<string> {
    this.dummyPasswordHash ??= this.cryptoService.hashPassword(
      randomBytes(32).toString('base64url'),
    );
    return this.dummyPasswordHash;
  }

  private async passwordLoginRateLimit(
    email: string,
    ipAddress?: string,
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const windowId = Math.floor(now / PASSWORD_LOGIN_WINDOW_SECONDS);
    const retryAfter =
      PASSWORD_LOGIN_WINDOW_SECONDS - (now % PASSWORD_LOGIN_WINDOW_SECONDS);
    const [accountAttempts, ipAttempts] = await Promise.all([
      this.authRepository.incrementPasswordLoginLimit(
        'account',
        this.cryptoService.hashToken(email),
        windowId,
        retryAfter,
      ),
      this.authRepository.incrementPasswordLoginLimit(
        'ip',
        this.cryptoService.hashToken(ipAddress || 'unknown'),
        windowId,
        retryAfter,
      ),
    ]);
    if (
      accountAttempts > PASSWORD_LOGIN_ACCOUNT_LIMIT ||
      ipAttempts > PASSWORD_LOGIN_IP_LIMIT
    ) {
      throw new AuthError('PASSWORD_LOGIN_RATE_LIMITED', {
        retryAfterSeconds: retryAfter,
      });
    }
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
    await this.verifyOtpCode(email, input.code);

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

    await this.usersService.updateLastLoginAt(user.id);
    await this.auditService.log({
      userId: user.id,
      action: 'auth.signin',
      subjectType: 'auth',
      description: `Login OTP: ${email}`,
      ipAddress: input.ipAddress,
    });

    return this.createSession(user);
  }

  async loginWithPassword(input: {
    email: string;
    password: string;
    ipAddress?: string;
  }): Promise<SessionResponse> {
    const email = input.email.trim().toLowerCase();
    await this.passwordLoginRateLimit(email, input.ipAddress);

    let user: Awaited<ReturnType<UsersService['selectByEmail']>> | null = null;
    try {
      user = await this.usersService.selectByEmail(email);
    } catch (error) {
      if (!(error instanceof UsersError) || error.code !== 'USER_NOT_FOUND')
        throw error;
    }

    const passwordHash =
      user?.passwordHash ?? (await this.getDummyPasswordHash());
    const passwordMatches = await this.cryptoService.verifyPassword(
      input.password,
      passwordHash,
    );
    if (
      !user ||
      !user.passwordHash ||
      user.status !== 'active' ||
      !passwordMatches
    ) {
      throw new AuthError('PASSWORD_INVALID_CREDENTIALS');
    }

    await this.usersService.updateLastLoginAt(user.id);
    await this.auditService.log({
      userId: user.id,
      action: 'auth.password.login',
      subjectType: 'auth',
      description: 'Login dengan kata sandi',
      ipAddress: input.ipAddress,
    });
    return this.createSession(user);
  }

  async requestPasswordReset(input: {
    email: string;
    application: 'admin' | 'learning';
    ipAddress?: string;
  }): Promise<void> {
    const email = input.email.trim().toLowerCase();
    const now = Math.floor(Date.now() / 1000);
    const windowId = Math.floor(now / PASSWORD_RESET_WINDOW_SECONDS);
    const retryAfter =
      PASSWORD_RESET_WINDOW_SECONDS - (now % PASSWORD_RESET_WINDOW_SECONDS);
    const [accountRequests, ipRequests] = await Promise.all([
      this.authRepository.incrementPasswordResetLimit(
        'account',
        this.cryptoService.hashToken(email),
        windowId,
        retryAfter,
      ),
      this.authRepository.incrementPasswordResetLimit(
        'ip',
        this.cryptoService.hashToken(input.ipAddress || 'unknown'),
        windowId,
        retryAfter,
      ),
    ]);
    if (
      accountRequests > PASSWORD_RESET_REQUEST_LIMIT ||
      ipRequests > PASSWORD_RESET_IP_LIMIT
    ) {
      return;
    }

    const origin =
      input.application === 'admin'
        ? this.passwordResetAdminOrigin
        : this.passwordResetLearningOrigin;
    if (!origin) return;

    let user: Awaited<ReturnType<UsersService['selectByEmail']>>;
    try {
      user = await this.usersService.selectByEmail(email);
    } catch (error) {
      if (error instanceof UsersError && error.code === 'USER_NOT_FOUND')
        return;
      throw error;
    }
    if (user.status !== 'active') return;

    const token = randomBytes(32).toString('base64url');
    await this.authRepository.savePasswordResetToken(
      this.cryptoService.hashToken(token),
      user.id,
      PASSWORD_RESET_TOKEN_TTL_SECONDS,
    );
    const resetPath =
      input.application === 'admin'
        ? '/reset-password/'
        : '/auth/reset-password/';
    try {
      await this.mailerService.send({
        to: email,
        subject: 'Atur ulang kata sandi CryptoSharia',
        html: createPasswordResetEmail({
          resetUrl: `${origin}${resetPath}${token}`,
        }),
      });
    } catch {
      // Keep the response identical for known and unknown accounts.
    }
  }

  async resetPassword(input: {
    token: string;
    newPassword: string;
    ipAddress?: string;
  }): Promise<void> {
    const userId = await this.authRepository.consumePasswordResetToken(
      this.cryptoService.hashToken(input.token),
    );
    if (!userId) throw new AuthError('PASSWORD_RESET_INVALID');

    let user: UserResponse;
    try {
      user = await this.usersService.selectById(userId);
    } catch (error) {
      if (error instanceof UsersError && error.code === 'USER_NOT_FOUND')
        throw new AuthError('PASSWORD_RESET_INVALID');
      throw error;
    }
    if (user.status !== 'active') throw new AuthError('PASSWORD_RESET_INVALID');

    const passwordHash = await this.cryptoService.hashPassword(
      input.newPassword,
    );
    await this.usersService.updatePassword(user.id, passwordHash);
    await this.authRepository.deleteUserSessions(user.id);
    await this.auditService.log({
      userId: user.id,
      action: 'auth.password.reset',
      subjectType: 'auth',
      description: 'Kata sandi diatur ulang dan sesi lama dicabut',
      ipAddress: input.ipAddress,
    });
  }

  async setPassword(input: {
    userId: string;
    otpCode: string;
    newPassword: string;
    ipAddress?: string;
  }): Promise<void> {
    let profile: UserResponse;
    try {
      profile = await this.usersService.selectById(input.userId);
    } catch (error) {
      if (error instanceof UsersError && error.code === 'USER_NOT_FOUND')
        throw new AuthError('REFRESH_TOKEN_INVALID');
      throw error;
    }
    if (profile.status !== 'active') throw new AuthError('USER_INACTIVE');

    const user = await this.usersService.selectByEmail(profile.email);
    if (user.passwordHash) throw new AuthError('PASSWORD_ALREADY_SET');
    await this.verifyOtpCode(profile.email, input.otpCode);

    const passwordHash = await this.cryptoService.hashPassword(
      input.newPassword,
    );
    await this.usersService.updatePassword(user.id, passwordHash);
    await this.auditService.log({
      userId: user.id,
      action: 'auth.password.set',
      subjectType: 'auth',
      description: 'Kata sandi pertama diatur setelah verifikasi email',
      ipAddress: input.ipAddress,
    });
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

  async me(userId: string): Promise<UserResponse & { hasPassword: boolean }> {
    let user: UserResponse;
    try {
      user = await this.usersService.selectById(userId);
    } catch (error) {
      if (error instanceof UsersError && error.code === 'USER_NOT_FOUND')
        throw new AuthError('REFRESH_TOKEN_INVALID');
      throw error;
    }
    if (user.status !== 'active') throw new AuthError('USER_INACTIVE');
    return {
      ...user,
      hasPassword: await this.usersService.hasPassword(userId),
    };
  }
}
