import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { users, emailVerifications } from '$lib/db/tables';
import { eq, and, isNull } from 'drizzle-orm';
import { hashPassword } from '$lib/auth/password';
import { ApiResponse } from '$lib/api';
import { parseJsonBody, parseQueryParams } from '$lib/api/request';
import { AuthSignupPostBody, AuthSignupPostResponse, AuthSignupPostQuery } from '..';
import { generateRandomToken } from '$lib/auth/tokens';
import { sendEmail } from '$lib/services/email';
import { logActivity } from '$lib/services/activity-logger';
import { escapeHtml } from '$lib/utils';
import { dev } from '$app/environment';
import { DEV_BASE_URL, BASE_DOMAIN } from '$lib/constants';

export const POST: RequestHandler = async ({ request, url }) => {
	const parsedBody = await parseJsonBody(request, AuthSignupPostBody);
	if (!parsedBody.ok) {
		return parsedBody.response;
	}

	const { name, email, password } = parsedBody.data;

	const parsedQuery = parseQueryParams(url, AuthSignupPostQuery);
	const notify = parsedQuery.ok ? parsedQuery.data.notify : true;

	const existingUser = await db.query.users.findFirst({
		where: eq(users.email, email)
	});

	if (existingUser && existingUser.isEmailVerified) {
		return ApiResponse.conflict('Email already registered');
	}

	try {
		const hashedPassword = await hashPassword(password);

		let newUser;

		if (existingUser) {
			[newUser] = await db
				.update(users)
				.set({
					name,
					hashedPassword,
					status: 'active'
				})
				.where(eq(users.id, existingUser.id))
				.returning();
		} else {
			[newUser] = await db
				.insert(users)
				.values({
					name,
					email,
					hashedPassword,
					status: 'active',
					isEmailVerified: false
				})
				.returning();
		}

		const verificationToken = generateRandomToken(32);
		const expiresAt = new Date();
		expiresAt.setHours(expiresAt.getHours() + 6);

		await db.transaction(async (tx) => {
			await tx
				.update(emailVerifications)
				.set({ revokedAt: new Date() })
				.where(
					and(eq(emailVerifications.userId, newUser.id), isNull(emailVerifications.revokedAt))
				);

			await tx.insert(emailVerifications).values({
				userId: newUser.id,
				token: verificationToken,
				expiresAt
			});
		});

		if (notify) {
			const safeName = escapeHtml(name);
			const baseUrl = dev
				? DEV_BASE_URL.replace('${PORT}', '3000')
				: `https://accounts.${BASE_DOMAIN}`;
			const verificationLink = `${baseUrl}/verify/${verificationToken}`;

			await sendEmail({
				to: email,
				subject: 'Verify your CryptoSharia Account',
				html: `
					<div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
						<h2 style="color: #f97316;">Welcome to CryptoSharia, ${safeName}!</h2>
						<p>Thank you for signing up. Please verify your email address to activate your account:</p>
						<div style="margin: 35px 0; text-align: center;">
							<a href="${verificationLink}"
							   style="background-color: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
								Verify Email Address
							</a>
						</div>
						<p style="font-size: 0.9em; color: #666;">
							If the button doesn't work, copy and paste this link into your browser:<br>
							<a href="${verificationLink}" style="color: #f97316;">${verificationLink}</a>
						</p>
						<hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
						<p style="font-size: 0.8em; color: #999;">
							This link will expire in 6 hours. If you did not create an account, please ignore this email.
						</p>
					</div>
				`
			});
		}

		await logActivity({
			userId: newUser.id,
			action: 'signup',
			subjectType: 'auth',
			description: `New user registered: ${newUser.email}`
		});

		return ApiResponse.created(
			AuthSignupPostResponse.parse(newUser),
			'User registered successfully. Please check your email for verification.'
		);
	} catch (error) {
		console.error('Signup error:', error);
		return ApiResponse.internalServerError('Failed to register user');
	}
};
