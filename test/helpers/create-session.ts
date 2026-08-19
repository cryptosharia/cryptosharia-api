import { MailerService } from '#src/modules/mailer/mailer.service';
import type { User } from '#src/modules/drizzle/drizzle.types';
import { UsersService } from '#src/modules/users/users.service';
import type { Context } from './context.type';
import type { TestMailerService } from './test-mailer.service';

export function getOtpCode(html: string): string {
  const match = html.match(/(\d{6})/);
  if (!match) throw new Error('Email does not contain an OTP code');
  return match[1];
}

export async function createSession(
  ctx: Context,
  email: string,
  role: User['role'] = 'member',
): Promise<{ user: User; accessToken: string }> {
  const mailer = ctx.app.get<TestMailerService>(MailerService);
  const usersService = ctx.app.get(UsersService);

  const request = await ctx.client.POST('/auth/otp/request', {
    body: { email },
  });
  expect(request.response.status).toBe(204);

  const verify = await ctx.client.POST('/auth/otp/verify', {
    body: { email, code: getOtpCode(mailer.messages.at(-1)!.html) },
  });
  expect(verify.response.status).toBe(200);
  if (!verify.data) throw new Error('Verify response has no session');

  const user = await usersService.selectByEmail(email);
  if (role !== 'member') await usersService.update(user.id, { role });

  // The verify response signs the JWT with the original role, so a promoted
  // session must refresh to embed the new role before the token is used.
  let accessToken = verify.data.accessToken;
  if (role !== 'member') {
    const refreshed = await ctx.client.POST('/auth/refresh', {
      body: { refreshToken: verify.data.refreshToken },
    });
    expect(refreshed.response.status).toBe(200);
    if (!refreshed.data)
      throw new Error('Refresh response has no access token');
    accessToken = refreshed.data.accessToken;
  }
  return { user, accessToken };
}
