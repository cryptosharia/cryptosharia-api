import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { AssetsModule } from '#src/modules/assets/assets.module';
import { DrizzleModule } from '#src/modules/drizzle/drizzle.module';
import { SecurityModule } from '#src/modules/security/security.module';
import { AuditModule } from '#src/modules/audit/audit.module';

@Module({
  imports: [DrizzleModule, SecurityModule, AssetsModule, AuditModule],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
