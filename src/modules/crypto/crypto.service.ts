import { Injectable } from '@nestjs/common';
import {
  JwtService,
  type JwtSignOptions,
  type JwtVerifyOptions,
} from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';

const PASSWORD_HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class CryptoService {
  constructor(private readonly jwtService: JwtService) {}

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, PASSWORD_HASH_OPTIONS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  needsPasswordRehash(hash: string): boolean {
    return argon2.needsRehash(hash, PASSWORD_HASH_OPTIONS);
  }

  signJwt(payload: Record<string, unknown>, options?: JwtSignOptions) {
    return this.jwtService.signAsync(payload, options);
  }

  verifyJwt<T extends object>(token: string, options?: JwtVerifyOptions) {
    return this.jwtService.verifyAsync<T>(token, options);
  }

  generateToken(length = 32): string {
    return randomBytes(length).toString('hex');
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
