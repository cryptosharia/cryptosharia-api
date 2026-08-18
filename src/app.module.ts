import {
  Module,
  type NestModule,
  type MiddlewareConsumer,
} from '@nestjs/common';
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
import { BearerAuthMiddleware } from './modules/security/bearer-auth.middleware';
import { ImageProviderModule } from './modules/image-provider/image-provider.module';
import { MailerModule } from './modules/mailer/mailer.module';
import { StorageModule } from './modules/storage/storage.module';
import { AuditModule } from './modules/audit/audit.module';
import { MarketDataModule } from './modules/market-data/market-data.module';
import { AuthModule } from './modules/auth/auth.module';
import { AssetsModule } from './modules/assets/assets.module';
import { TagsModule } from './modules/tags/tags.module';
import { MessagesModule } from './modules/messages/messages.module';
import { PostsModule } from './modules/posts/posts.module';
import { CryptoassetsModule } from './modules/cryptoassets/cryptoassets.module';

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
    AuditModule,
    MarketDataModule,
    AuthModule,
    AssetsModule,
    TagsModule,
    MessagesModule,
    PostsModule,
    CryptoassetsModule,
  ],
  providers: [
    { provide: APP_GUARD, useExisting: ApiKeyGuard },
    { provide: APP_FILTER, useClass: AppExceptionFilter },
    { provide: APP_FILTER, useClass: ZodExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BearerAuthMiddleware).forRoutes('*');
  }
}
