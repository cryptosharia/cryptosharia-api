import { eq } from 'drizzle-orm';

import { db } from '$lib/db';
import { users } from '$lib/db/tables';
import { toAssetMetadata } from '$lib/services/assets';
import type { Role } from '$lib/auth/rbac';

export type UserDetail = {
	id: string;
	name: string;
	email: string;
	role: Role;
	status: (typeof users.$inferSelect)['status'];
	isEmailVerified: boolean;
	avatar: ReturnType<typeof toAssetMetadata>;
	createdAt: Date;
	updatedAt: Date | null;
	lastLoginAt: Date | null;
	updatedBy: string | null;
};

async function fetchUserWithAvatar(id: string) {
	return db.query.users.findFirst({
		where: eq(users.id, id),
		with: {
			avatar: true
		}
	});
}

function toUserDetail(
	user: NonNullable<Awaited<ReturnType<typeof fetchUserWithAvatar>>>
): UserDetail {
	return {
		...user,
		avatar: toAssetMetadata(user.avatar),
		role: user.role
	};
}

export async function getUserDetail(id: string): Promise<UserDetail | null> {
	const user = await fetchUserWithAvatar(id);
	if (!user) {
		return null;
	}

	return toUserDetail(user);
}

export async function updateUserProfile(params: {
	id: string;
	name?: string;
	avatarId?: string | null;
	updatedBy: string;
}): Promise<UserDetail | null> {
	const [updatedUser] = await db
		.update(users)
		.set({
			name: params.name,
			avatarId: params.avatarId,
			updatedBy: params.updatedBy
		})
		.where(eq(users.id, params.id))
		.returning({ id: users.id });

	if (!updatedUser) {
		return null;
	}

	return getUserDetail(updatedUser.id);
}

export async function updateUserStatus(params: {
	id: string;
	status: (typeof users.$inferSelect)['status'];
	updatedBy: string;
}): Promise<UserDetail | null> {
	const [updatedUser] = await db
		.update(users)
		.set({
			status: params.status,
			updatedBy: params.updatedBy
		})
		.where(eq(users.id, params.id))
		.returning({ id: users.id });

	if (!updatedUser) {
		return null;
	}

	return getUserDetail(updatedUser.id);
}

export async function updateUserRole(params: {
	id: string;
	role: Role;
	updatedBy: string;
}): Promise<UserDetail | null> {
	const [updatedUser] = await db
		.update(users)
		.set({
			role: params.role,
			updatedBy: params.updatedBy
		})
		.where(eq(users.id, params.id))
		.returning({ id: users.id });

	if (!updatedUser) {
		return null;
	}

	return getUserDetail(updatedUser.id);
}
