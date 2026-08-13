import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { RateLimitModule } from '#src/modules/rate-limit/rate-limit.module';
import { ApiKeyGuard } from './api-key.guard';
import { BearerAuthGuard } from './bearer-auth.guard';
import { PermissionGuard } from './permission.guard';

@Global()
@Module({
  imports: [
    ConfigModule,
    RateLimitModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('ACCESS_TOKEN_SECRET'),
        signOptions: { issuer: 'api.cryptosharia.id' },
      }),
    }),
  ],
  providers: [
    ApiKeyGuard,
    BearerAuthGuard,
    PermissionGuard,
    { provide: APP_GUARD, useExisting: ApiKeyGuard },
  ],
  exports: [BearerAuthGuard, PermissionGuard, JwtModule],
})
export class SecurityModule {}
