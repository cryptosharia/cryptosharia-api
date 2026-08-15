import { Injectable } from '@nestjs/common';
import { ActivityLogsService } from '#src/modules/activity-logs/activity-logs.service';
import { CryptoService } from '#src/modules/crypto/crypto.service';
import type { User } from '#src/modules/drizzle/drizzle.types';
import { MailerService } from '#src/modules/mailer/mailer.service';
import { UsersError } from '#src/modules/users/users.error';
import { UsersService } from '#src/modules/users/users.service';
import {
  ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  ACCESS_TOKEN_ISSUER,
  REFRESH_TOKEN_EXPIRES_IN_DAYS,
  PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES,
  VERIFICATION_TOKEN_EXPIRES_IN_HOURS,
} from './auth.constants';
import { AuthError } from './auth.error';
import { AuthRepository } from './auth.repository';
import {
  createPasswordResetEmail,
  createVerificationEmail,
} from './auth.helpers';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly usersService: UsersService,
    private readonly cryptoService: CryptoService,
    private readonly mailerService: MailerService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  private createAccessToken(user: Pick<User, 'id' | 'role'>) {
    return this.cryptoService.signJwt(
      { userId: user.id, role: user.role },
      {
        issuer: ACCESS_TOKEN_ISSUER,
        expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
      },
    );
  }

  async signup(input: {
    name: string;
    email: string;
    password: string;
    redirectUrl: string;
    ipAddress?: string;
  }) {
    const token = this.cryptoService.generateToken();
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setHours(
      expiresAt.getHours() + VERIFICATION_TOKEN_EXPIRES_IN_HOURS,
    );
    const email = input.email.trim().toLowerCase();
    const hashedPassword = await this.cryptoService.hashPassword(
      input.password,
    );

    const user = await this.authRepository.transaction(async (tx) => {
      let user: User | undefined;
      try {
        user = await this.usersService.selectByEmail(email, tx);
      } catch (error) {
        if (!(error instanceof UsersError) || error.code !== 'USER_NOT_FOUND')
          throw error;
      }
      if (user?.isEmailVerified)
        throw new AuthError('EMAIL_ALREADY_REGISTERED');

      const savedUser = user
        ? await this.usersService.update(
            user.id,
            { name: input.name.trim(), hashedPassword, status: 'active' },
            undefined,
            tx,
          )
        : await this.usersService.insert(
            { name: input.name.trim(), email, hashedPassword },
            tx,
          );
      await this.authRepository.revokeActiveAuthTokens(
        savedUser.id,
        'email_verification',
        now,
        tx,
      );
      await this.authRepository.insertAuthToken(
        {
          userId: savedUser.id,
          type: 'email_verification',
          tokenHash: this.cryptoService.hashToken(token),
          expiresAt,
        },
        tx,
      );
      return savedUser;
    });

    await this.mailerService.send({
      to: user.email,
      subject: 'Verify your CryptoSharia Account',
      html: createVerificationEmail({
        name: user.name,
        url: input.redirectUrl.replace('{token}', encodeURIComponent(token)),
      }),
    });
    await this.activityLogsService.log({
      userId: user.id,
      action: 'auth.signup',
      subjectType: 'auth',
      description: `New user registered: ${user.email}`,
      ipAddress: input.ipAddress,
    });
    return user;
  }

  async verify(input: { token: string; ipAddress?: string }) {
    const userId = await this.authRepository.transaction(async (tx) => {
      const token = await this.authRepository.consumeAuthToken(
        {
          type: 'email_verification',
          tokenHash: this.cryptoService.hashToken(input.token),
          now: new Date(),
        },
        tx,
      );
      if (!token) throw new AuthError('VERIFICATION_TOKEN_INVALID');
      await this.usersService.update(
        token.userId,
        { isEmailVerified: true },
        undefined,
        tx,
      );
      return token.userId;
    });
    await this.activityLogsService.log({
      userId,
      action: 'auth.verify',
      subjectType: 'auth',
      description: 'Email verification completed',
      ipAddress: input.ipAddress,
    });
  }

  async signin(input: { email: string; password: string; ipAddress?: string }) {
    let user: User;
    try {
      user = await this.usersService.selectByEmail(
        input.email.trim().toLowerCase(),
      );
    } catch (error) {
      if (error instanceof UsersError && error.code === 'USER_NOT_FOUND')
        throw new AuthError('INVALID_CREDENTIALS');
      throw error;
    }
    if (!user.isEmailVerified) throw new AuthError('INVALID_CREDENTIALS');
    if (user.status !== 'active') throw new AuthError('USER_INACTIVE');
    if (
      !(await this.cryptoService.verifyPassword(
        input.password,
        user.hashedPassword,
      ))
    )
      throw new AuthError('INVALID_CREDENTIALS');

    const refreshToken = this.cryptoService.generateToken();
    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setDate(
      refreshTokenExpiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN_DAYS,
    );
    await this.authRepository.transaction(async (tx) => {
      await this.usersService.update(
        user.id,
        {
          ...(this.cryptoService.needsPasswordRehash(user.hashedPassword)
            ? {
                hashedPassword: await this.cryptoService.hashPassword(
                  input.password,
                ),
              }
            : {}),
          lastLoginAt: new Date(),
        },
        undefined,
        tx,
      );
      await this.authRepository.insertRefreshToken(
        {
          userId: user.id,
          token: this.cryptoService.hashToken(refreshToken),
          expiresAt: refreshTokenExpiresAt,
        },
        tx,
      );
    });
    await this.activityLogsService.log({
      userId: user.id,
      action: 'auth.signin',
      subjectType: 'auth',
      ipAddress: input.ipAddress,
    });
    return { accessToken: await this.createAccessToken(user), refreshToken };
  }

  async refresh(input: { refreshToken: string; ipAddress?: string }) {
    const refreshToken = this.cryptoService.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN_DAYS);
    const user = await this.authRepository.transaction(async (tx) => {
      const oldToken = await this.authRepository.consumeRefreshToken(
        {
          tokenHash: this.cryptoService.hashToken(input.refreshToken),
          now: new Date(),
        },
        tx,
      );
      if (!oldToken) throw new AuthError('REFRESH_TOKEN_INVALID');
      let user: User;
      try {
        user = await this.usersService.selectById(oldToken.userId, tx);
      } catch (error) {
        if (error instanceof UsersError && error.code === 'USER_NOT_FOUND')
          throw new AuthError('REFRESH_TOKEN_INVALID');
        throw error;
      }
      if (user.status !== 'active') throw new AuthError('USER_INACTIVE');
      await this.authRepository.insertRefreshToken(
        {
          userId: user.id,
          token: this.cryptoService.hashToken(refreshToken),
          expiresAt,
        },
        tx,
      );
      return user;
    });
    await this.activityLogsService.log({
      userId: user.id,
      action: 'auth.refresh',
      subjectType: 'auth',
      description: 'Access and refresh tokens rotated',
      ipAddress: input.ipAddress,
    });
    return { accessToken: await this.createAccessToken(user), refreshToken };
  }

  async signout(input: { refreshToken: string; ipAddress?: string }) {
    const token = await this.authRepository.revokeRefreshToken(
      this.cryptoService.hashToken(input.refreshToken),
      new Date(),
    );
    if (token)
      await this.activityLogsService.log({
        userId: token.userId,
        action: 'auth.signout',
        subjectType: 'auth',
        description: 'Refresh token revoked via signout',
        ipAddress: input.ipAddress,
      });
  }

  async me(userId: string) {
    let user: User;
    try {
      user = await this.usersService.selectById(userId);
    } catch (error) {
      if (error instanceof UsersError && error.code === 'USER_NOT_FOUND')
        throw new AuthError('INVALID_CREDENTIALS');
      throw error;
    }
    if (user.status !== 'active') throw new AuthError('USER_INACTIVE');
    return user;
  }

  async forgotPassword(input: {
    email: string;
    redirectUrl: string;
    ipAddress?: string;
  }) {
    let user: User;
    try {
      user = await this.usersService.selectByEmail(
        input.email.trim().toLowerCase(),
      );
    } catch (error) {
      if (error instanceof UsersError && error.code === 'USER_NOT_FOUND')
        return;
      throw error;
    }

    const token = this.cryptoService.generateToken();
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMinutes(
      expiresAt.getMinutes() + PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES,
    );
    await this.authRepository.transaction(async (tx) => {
      await this.authRepository.revokeActiveAuthTokens(
        user.id,
        'password_reset',
        now,
        tx,
      );
      await this.authRepository.insertAuthToken(
        {
          userId: user.id,
          type: 'password_reset',
          tokenHash: this.cryptoService.hashToken(token),
          expiresAt,
        },
        tx,
      );
    });
    await this.activityLogsService.log({
      userId: user.id,
      action: 'auth.password-reset.request',
      subjectType: 'auth',
      description: 'Password reset requested',
      ipAddress: input.ipAddress,
    });
    try {
      await this.mailerService.send({
        to: user.email,
        subject: 'Reset your CryptoSharia password',
        html: createPasswordResetEmail({
          url: input.redirectUrl.replace('{token}', encodeURIComponent(token)),
        }),
      });
    } catch {
      // The generic response must not disclose email delivery or account existence.
    }
  }

  async resetPassword(input: {
    token: string;
    password: string;
    ipAddress?: string;
  }) {
    const userId = await this.authRepository.transaction(async (tx) => {
      const token = await this.authRepository.consumeAuthToken(
        {
          type: 'password_reset',
          tokenHash: this.cryptoService.hashToken(input.token),
          now: new Date(),
        },
        tx,
      );
      if (!token) throw new AuthError('PASSWORD_RESET_TOKEN_INVALID');
      await this.usersService.update(
        token.userId,
        {
          hashedPassword: await this.cryptoService.hashPassword(input.password),
        },
        undefined,
        tx,
      );
      await this.authRepository.revokeActiveRefreshTokens(
        token.userId,
        new Date(),
        tx,
      );
      return token.userId;
    });
    await this.activityLogsService.log({
      userId,
      action: 'auth.password-reset.complete',
      subjectType: 'auth',
      description: 'Password reset completed successfully',
      ipAddress: input.ipAddress,
    });
  }
}
