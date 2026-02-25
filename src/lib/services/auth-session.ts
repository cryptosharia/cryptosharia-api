import { and, eq, gt, isNull } from 'drizzle-orm';

import { db } from '$lib/db';
import { refreshTokens, users } from '$lib/db/tables';
import { createRefreshToken, signAccessToken } from '$lib/auth/tokens';

type RotateResult =
	| { ok: false; reason: 'invalid' }
	| { ok: false; reason: 'inactive' }
	| {
			ok: true;
			user: typeof users.$inferSelect;
			accessToken: string;
			refreshToken: string;
	  };

export async function rotateRefreshSession(oldToken: string): Promise<RotateResult> {
	const payload = await db.transaction(async (tx) => {
		const now = new Date();

		const [consumedToken] = await tx
			.update(refreshTokens)
			.set({ revokedAt: now })
			.where(
				and(
					eq(refreshTokens.token, oldToken),
					isNull(refreshTokens.revokedAt),
					gt(refreshTokens.expiresAt, now)
				)
			)
			.returning({ userId: refreshTokens.userId });

		if (!consumedToken) {
			return null;
		}

		const user = await tx.query.users.findFirst({
			where: eq(users.id, consumedToken.userId)
		});

		if (!user) {
			return null;
		}

		if (user.status !== 'active') {
			return { inactive: true } as const;
		}

		const accessToken = await signAccessToken({
			userId: user.id,
			role: user.role
		});

		const refreshToken = createRefreshToken(user.id);
		await tx.insert(refreshTokens).values(refreshToken);

		return {
			inactive: false,
			user,
			accessToken,
			refreshToken: refreshToken.token
		} as const;
	});

	if (!payload) {
		return { ok: false, reason: 'invalid' };
	}

	if (payload.inactive) {
		return { ok: false, reason: 'inactive' };
	}

	return {
		ok: true,
		user: payload.user,
		accessToken: payload.accessToken,
		refreshToken: payload.refreshToken
	};
}
