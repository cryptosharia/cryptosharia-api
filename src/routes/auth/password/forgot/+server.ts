import type { RequestHandler } from './$types';
import { ApiResponse } from '$lib/api';
import { parseJsonBody, parseQueryParams } from '$lib/api/request';
import { db } from '$lib/db';
import { authTokens, users } from '$lib/db/tables';
import { and, eq, isNull } from 'drizzle-orm';
import { AuthPasswordForgotPostBody, AuthPasswordForgotPostQuery } from '../..';
import { generateRandomToken, hashOpaqueToken } from '$lib/auth/tokens';
import { sendEmail } from '$lib/services/email';
import { logActivity } from '$lib/services/activity-logger';
import { BASE_DOMAIN } from '$lib/constants';

export const POST: RequestHandler = async ({ request, locals, url }) => {
	const parsedBody = await parseJsonBody(request, AuthPasswordForgotPostBody);
	if (!parsedBody.ok) {
		return parsedBody.response;
	}

	const parsedQuery = parseQueryParams(url, AuthPasswordForgotPostQuery);
	const notify = parsedQuery.ok ? parsedQuery.data.notify : true;

	const { email } = parsedBody.data;

	try {
		const user = await db.query.users.findFirst({
			where: eq(users.email, email)
		});

		if (user) {
			const resetToken = generateRandomToken(32);
			const tokenHash = hashOpaqueToken(resetToken);
			const expiresAt = new Date();
			expiresAt.setMinutes(expiresAt.getMinutes() + 30);

			await db.transaction(async (tx) => {
				await tx
					.update(authTokens)
					.set({ revokedAt: new Date() })
					.where(
						and(
							eq(authTokens.userId, user.id),
							eq(authTokens.type, 'password_reset'),
							isNull(authTokens.revokedAt)
						)
					);

				await tx.insert(authTokens).values({
					userId: user.id,
					type: 'password_reset',
					tokenHash,
					expiresAt
				});
			});

			await logActivity({
				userId: user.id,
				action: 'auth.password-reset.request',
				subjectType: 'auth',
				description: 'Password reset requested',
				ipAddress: locals.clientIp
			});

			const baseUrl = `https://admin.${BASE_DOMAIN}`;
			const resetLink = `${baseUrl}/reset-password/${resetToken}`;

			if (notify) {
				try {
					await sendEmail({
						to: email,
						subject: 'Reset your CryptoSharia password',
						html: `
						<div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
							<h2 style="color: #f97316;">Password Reset Request</h2>
							<p>We received a request to reset your password.</p>
							<div style="margin: 35px 0; text-align: center;">
								<a href="${resetLink}"
								   style="background-color: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
									Reset Password
								</a>
							</div>
							<p style="font-size: 0.9em; color: #666;">
								If the button doesn't work, copy and paste this link into your browser:<br>
								<a href="${resetLink}" style="color: #f97316;">${resetLink}</a>
							</p>
							<hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
							<p style="font-size: 0.8em; color: #999;">
								This link expires in 30 minutes. If you did not request this, please ignore this email.
							</p>
						</div>
					`
					});
				} catch (error) {
					console.error('Password forgot email send error:', error);
				}
			}
		}

		return ApiResponse.ok(undefined, 'If your email is registered, a reset link has been sent');
	} catch (error) {
		console.error('Password forgot error:', error);
		return ApiResponse.internalServerError('Failed to process password reset request');
	}
};
