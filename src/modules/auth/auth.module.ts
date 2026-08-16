import { Module } from '@nestjs/common';
import { AuditModule } from '#src/modules/audit/audit.module';
import { CryptoModule } from '#src/modules/crypto/crypto.module';
import { DrizzleModule } from '#src/modules/drizzle/drizzle.module';
import { MailerModule } from '#src/modules/mailer/mailer.module';
import { UsersModule } from '#src/modules/users/users.module';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';

@Module({
  imports: [
    DrizzleModule,
    CryptoModule,
    MailerModule,
    AuditModule,
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthRepository, AuthService],
  exports: [AuthService],
})
export class AuthModule {}
