import { Injectable } from '@nestjs/common';
import {
  JwtService,
  type JwtSignOptions,
  type JwtVerifyOptions,
} from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';

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
}
