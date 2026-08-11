import { Injectable, NestInterceptor, CallHandler } from '@nestjs/common';
import { User } from '#src/modules/drizzle/drizzle.types';
import { Observable, map } from 'rxjs';
import { z } from 'zod';

@Injectable()
export class ExcludeSensitiveFieldsInterceptor implements NestInterceptor {
  private checkIsUser(data: unknown): data is User {
    return User.safeParse(data).success;
  }

  private checkIsUserList(data: unknown): data is User[] {
    return z.array(User).safeParse(data).success;
  }

  private stripPassword(
    user: User,
  ): Omit<
    User,
    'hashedPassword' | 'twoFactorSecret' | 'passwordHashingAlgorithm'
  > {
    const {
      hashedPassword,
      twoFactorSecret,
      passwordHashingAlgorithm,
      ...rest
    } = user;
    void hashedPassword;
    void twoFactorSecret;
    void passwordHashingAlgorithm;
    return rest;
  }

  intercept(_: unknown, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (this.checkIsUserList(data))
          return data.map((user) => this.stripPassword(user));
        if (this.checkIsUser(data)) return this.stripPassword(data);
        return data;
      }),
    );
  }
}
