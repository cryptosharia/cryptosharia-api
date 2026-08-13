import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';
import { MailerAdapter } from './mailer.adapter';

@Module({
  providers: [MailerAdapter, MailerService],
  exports: [MailerService],
})
export class MailerModule {}
