import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { MailerError } from './mailer.error';

@Injectable()
export class MailerAdapter {
  private readonly resend: Resend;

  constructor(configService: ConfigService) {
    this.resend = new Resend(
      configService.getOrThrow<string>('RESEND_API_KEY'),
    );
  }

  async send({
    to,
    subject,
    html,
    from,
    replyTo,
  }: {
    to: string;
    subject: string;
    html: string;
    from: string;
    replyTo: string;
  }): Promise<void> {
    try {
      const { error } = await this.resend.emails.send({
        from,
        to,
        subject,
        html,
        replyTo,
      });

      if (error) throw new MailerError('MAILER_PROVIDER_FAILURE');
    } catch (error) {
      if (error instanceof MailerError) throw error;

      throw new MailerError('MAILER_PROVIDER_FAILURE');
    }
  }
}
