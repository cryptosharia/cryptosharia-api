import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { validate } from './env.validation';
import { ZodExceptionFilter } from './zod.exception-filter';
import { AppExceptionFilter } from './app.exception-filter';
import { DrizzleModule } from './modules/drizzle/drizzle.module';
import { UsersModule } from './modules/users/users.module';
import { OpenApiModule } from './modules/openapi/openapi.module';
import { SystemModule } from './modules/system/system.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    SystemModule,
    DrizzleModule,
    UsersModule,
    OpenApiModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AppExceptionFilter },
    { provide: APP_FILTER, useClass: ZodExceptionFilter },
  ],
})
export class AppModule {}
