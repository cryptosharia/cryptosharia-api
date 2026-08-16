import { escapeHtml } from '#src/common/escape-html';
import type { Message } from '#src/modules/drizzle/drizzle.types';

export function createMessageEmail(message: Message): string {
  const name = escapeHtml(message.name);
  const email = escapeHtml(message.email);
  const content = escapeHtml(message.message).replace(/\n/g, '<br>');

  return `<div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 640px; margin: 0 auto;">
  <div style="padding: 18px 20px; background: #f97316; border-radius: 14px 14px 0 0;">
    <div style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.9);">CryptoSharia</div>
    <div style="font-size: 18px; font-weight: 700; color: #ffffff; margin-top: 2px;">Pesan kontak baru</div>
  </div>
  <div style="padding: 18px 20px; border: 1px solid #eee; border-top: 0; border-radius: 0 0 14px 14px; background: #ffffff;">
    <p><strong>Nama:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Pesan:</strong></p>
    <p>${content}</p>
  </div>
</div>`;
}
