import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '#src/modules/mailer/mailer.service';
import type { Message } from '#src/modules/drizzle/drizzle.types';
import { createMessageEmail } from './messages.helpers';
import { MessagesRepository } from './messages.repository';

@Injectable()
export class MessagesService {
  private readonly recipient: string;

  constructor(
    private readonly messagesRepository: MessagesRepository,
    private readonly mailerService: MailerService,
    configService: ConfigService,
  ) {
    this.recipient = configService.getOrThrow<string>('CONTACT_FORM_TO_EMAIL');
  }

  selectAll(input: {
    page: number;
    limit: number;
    search?: string;
    senders?: string[];
  }) {
    return this.messagesRepository.selectAll(input);
  }

  count(input: { search?: string; senders?: Message['email'][] }) {
    return this.messagesRepository.count(input);
  }

  selectById(id: Message['id']) {
    return this.messagesRepository.selectById(id);
  }

  async create(
    data: Pick<Message, 'name' | 'email' | 'message'>,
  ): Promise<Message> {
    const message = await this.messagesRepository.insert(data);
    try {
      await this.mailerService.send({
        to: this.recipient,
        replyTo: message.email,
        subject: 'Pesan kontak baru',
        html: createMessageEmail(message),
      });
    } catch {
      // Message persistence succeeds even when contact notification delivery fails.
    }
    return message;
  }
}
