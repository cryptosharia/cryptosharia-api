import { Module } from '@nestjs/common';
import { DrizzleModule } from '#src/modules/drizzle/drizzle.module';
import { MailerModule } from '#src/modules/mailer/mailer.module';
import { SecurityModule } from '#src/modules/security/security.module';
import { MessagesController } from './messages.controller';
import { MessagesRepository } from './messages.repository';
import { MessagesService } from './messages.service';

@Module({
  imports: [DrizzleModule, MailerModule, SecurityModule],
  controllers: [MessagesController],
  providers: [MessagesRepository, MessagesService],
})
export class MessagesModule {}
