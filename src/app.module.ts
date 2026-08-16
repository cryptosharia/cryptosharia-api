import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { validate } from './env.validation';
import { ZodExceptionFilter } from './zod.exception-filter';
import { AppExceptionFilter } from './app.exception-filter';
import { DrizzleModule } from './modules/drizzle/drizzle.module';
import { UsersModule } from './modules/users/users.module';
import { OpenApiModule } from './modules/openapi/openapi.module';
import { SystemModule } from './modules/system/system.module';
import { SecurityModule } from './modules/security/security.module';
import { ApiKeyGuard } from './modules/security/api-key.guard';
import { ImageProviderModule } from './modules/image-provider/image-provider.module';
import { MailerModule } from './modules/mailer/mailer.module';
import { StorageModule } from './modules/storage/storage.module';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { MarketDataModule } from './modules/market-data/market-data.module';
import { AuthModule } from './modules/auth/auth.module';
import { AssetsModule } from './modules/assets/assets.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    SystemModule,
    DrizzleModule,
    UsersModule,
    OpenApiModule,
    SecurityModule,
    MailerModule,
    StorageModule,
    ImageProviderModule,
    ActivityLogsModule,
    MarketDataModule,
    AuthModule,
    AssetsModule,
  ],
  providers: [
    { provide: APP_GUARD, useExisting: ApiKeyGuard },
    { provide: APP_FILTER, useClass: AppExceptionFilter },
    { provide: APP_FILTER, useClass: ZodExceptionFilter },
  ],
})
export class AppModule {}
