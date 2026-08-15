import {
  PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES,
  VERIFICATION_TOKEN_EXPIRES_IN_HOURS,
} from './auth.constants';

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[character]!,
  );
}

export function createVerificationEmail(input: { name: string; url: string }) {
  const name = escapeHtml(input.name);
  const url = escapeHtml(input.url);

  return `
<div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #f97316;">Selamat datang di CryptoSharia, ${name}!</h2>
  <p>Terima kasih telah mendaftar. Silakan verifikasi alamat email Anda untuk mengaktifkan akun:</p>
  <div style="margin: 35px 0; text-align: center;">
    <a href="${url}" style="background-color: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
      Verifikasi Alamat Email
    </a>
  </div>
  <p style="font-size: 0.9em; color: #666;">
    Jika tombol di atas tidak berfungsi, salin dan tempel tautan berikut ke browser Anda:<br>
    <a href="${url}" style="color: #f97316;">${url}</a>
  </p>
  <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="font-size: 0.8em; color: #999;">
    Tautan ini berlaku selama ${VERIFICATION_TOKEN_EXPIRES_IN_HOURS} jam. Jika Anda tidak merasa membuat akun, abaikan email ini.
  </p>
</div>
`.trim();
}

export function createPasswordResetEmail(input: { url: string }) {
  const url = escapeHtml(input.url);

  return `
<div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #f97316;">Permintaan Reset Password</h2>
  <p>Kami menerima permintaan untuk mengatur ulang password akun Anda.</p>
  <div style="margin: 35px 0; text-align: center;">
    <a href="${url}" style="background-color: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
      Reset password
    </a>
  </div>
  <p style="font-size: 0.9em; color: #666;">
    Jika tombol di atas tidak berfungsi, salin dan tempel tautan berikut ke browser Anda:<br>
    <a href="${url}" style="color: #f97316;">${url}</a>
  </p>
  <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="font-size: 0.8em; color: #999;">
    Tautan ini berlaku selama ${PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES} menit. Jika Anda tidak meminta reset password, abaikan email ini.
  </p>
</div>
`.trim();
}
