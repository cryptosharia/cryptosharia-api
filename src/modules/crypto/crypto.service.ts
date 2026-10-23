import { Injectable } from '@nestjs/common';
import {
  JwtService,
  type JwtSignOptions,
  type JwtVerifyOptions,
} from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';

@Injectable()
export class CryptoService {
  constructor(private readonly jwtService: JwtService) {}

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

  hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 64 * 1024,
      timeCost: 3,
      parallelism: 1,
    });
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }
}
