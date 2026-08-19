import { Module } from '@nestjs/common';
import { AuditModule } from '#src/modules/audit/audit.module';
import { CryptoModule } from '#src/modules/crypto/crypto.module';
import { MailerModule } from '#src/modules/mailer/mailer.module';
import { RedisModule } from '#src/modules/redis/redis.module';
import { UsersModule } from '#src/modules/users/users.module';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';

@Module({
  imports: [CryptoModule, MailerModule, AuditModule, UsersModule, RedisModule],
  controllers: [AuthController],
  providers: [AuthRepository, AuthService],
  exports: [AuthService],
})
export class AuthModule {}
