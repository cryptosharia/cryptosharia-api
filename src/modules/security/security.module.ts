import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { RateLimitModule } from '#src/modules/rate-limit/rate-limit.module';
import { ApiKeyGuard } from './api-key.guard';
import { BearerAuthGuard } from './bearer-auth.guard';
import { PermissionGuard } from './permission.guard';

@Global()
@Module({
  imports: [
    RateLimitModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('ACCESS_TOKEN_SECRET'),
        signOptions: { issuer: 'api.cryptosharia.id' },
      }),
    }),
  ],
  providers: [ApiKeyGuard, BearerAuthGuard, PermissionGuard],
  exports: [ApiKeyGuard, BearerAuthGuard, PermissionGuard, JwtModule],
})
export class SecurityModule {}
