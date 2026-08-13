import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { ExcludeSensitiveFieldsInterceptor } from './exclude-sensitive-fields.interceptor';
import { DrizzleModule } from '#src/modules/drizzle/drizzle.module';

@Module({
  imports: [DrizzleModule],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService, ExcludeSensitiveFieldsInterceptor],
  exports: [UsersService],
})
export class UsersModule {}
