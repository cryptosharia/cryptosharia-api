import { escapeHtml } from '#src/common/escape-html';
import { OTP_TTL_SECONDS } from './auth.constants';

export function createOtpEmail(input: { code: string }) {
  const code = escapeHtml(input.code);

  return `
<div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #f97316;">Kode Masuk CryptoSharia</h2>
  <p>Gunakan kode berikut untuk masuk ke akun Anda:</p>
  <div style="margin: 35px 0; text-align: center; font-size: 2em; font-weight: bold; letter-spacing: 8px; color: #f97316;">
    ${code}
  </div>
  <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="font-size: 0.8em; color: #999;">
    Kode ini berlaku selama ${Math.round(OTP_TTL_SECONDS / 60)} menit. Jika Anda tidak meminta kode ini, abaikan email ini.
  </p>
</div>
`.trim();
}
