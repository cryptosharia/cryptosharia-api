import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { ExcludeSensitiveFieldsInterceptor } from './exclude-sensitive-fields.interceptor';
import { DrizzleModule } from '#src/modules/drizzle/drizzle.module';
import { SecurityModule } from '#src/modules/security/security.module';

@Module({
  imports: [DrizzleModule, SecurityModule],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService, ExcludeSensitiveFieldsInterceptor],
  exports: [UsersService],
})
export class UsersModule {}
