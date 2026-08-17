import { Global, Module } from '@nestjs/common';
import { CryptoModule } from '#src/modules/crypto/crypto.module';
import { RateLimitModule } from '#src/modules/rate-limit/rate-limit.module';
import { ApiKeyGuard } from './api-key.guard';
import { AuthenticationGuard } from './authentication.guard';
import { BearerAuthMiddleware } from './bearer-auth.middleware';
import { PermissionGuard } from './permission.guard';

@Global()
@Module({
  imports: [RateLimitModule, CryptoModule],
  providers: [
    ApiKeyGuard,
    AuthenticationGuard,
    PermissionGuard,
    BearerAuthMiddleware,
  ],
  exports: [ApiKeyGuard, AuthenticationGuard, PermissionGuard, CryptoModule],
})
export class SecurityModule {}
