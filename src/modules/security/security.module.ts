import { Global, Module } from '@nestjs/common';
import { CryptoModule } from '#src/modules/crypto/crypto.module';
import { RateLimitModule } from '#src/modules/rate-limit/rate-limit.module';
import { ApiKeyGuard } from './api-key.guard';
import { BearerAuthGuard } from './bearer-auth.guard';
import { PermissionGuard } from './permission.guard';

@Global()
@Module({
  imports: [RateLimitModule, CryptoModule],
  providers: [ApiKeyGuard, BearerAuthGuard, PermissionGuard],
  exports: [ApiKeyGuard, BearerAuthGuard, PermissionGuard, CryptoModule],
})
export class SecurityModule {}
