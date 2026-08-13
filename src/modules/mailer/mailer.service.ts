import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MailerAdapter } from './mailer.adapter';

@Injectable()
export class MailerService {
  private readonly from: string;
  private readonly replyTo: string;

  constructor(
    private readonly mailerAdapter: MailerAdapter,
    configService: ConfigService,
  ) {
    this.from = configService.getOrThrow<string>('RESEND_FROM');
    this.replyTo = configService.getOrThrow<string>('RESEND_REPLY_TO');
  }

  send(input: {
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
  }): Promise<void> {
    return this.mailerAdapter.send({
      ...input,
      from: this.from,
      replyTo: input.replyTo ?? this.replyTo,
    });
  }
}
