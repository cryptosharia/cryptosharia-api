import { relations } from 'drizzle-orm';
import {
	admins,
	roles,
	permissions,
	rolePermissions,
	activityLogs,
	tokens,
	assets,
	tokenTags,
	tags,
	posts,
	postTags
} from './tables';

/**
 * Relations for the Admins table.
 */
export const adminsRelations = relations(admins, ({ one, many }) => ({
	role: one(roles, {
		fields: [admins.roleId],
		references: [roles.id]
	}),
	createdBy: one(admins, {
		fields: [admins.createdBy],
		references: [admins.id],
		relationName: 'admin_created_by'
	}),
	updatedBy: one(admins, {
		fields: [admins.updatedBy],
		references: [admins.id],
		relationName: 'admin_updated_by'
	}),
	activityLogs: many(activityLogs)
}));

/**
 * Relations for the Roles table.
 */
export const rolesRelations = relations(roles, ({ one, many }) => ({
	createdBy: one(admins, {
		fields: [roles.createdBy],
		references: [admins.id]
	}),
	updatedBy: one(admins, {
		fields: [roles.updatedBy],
		references: [admins.id]
	}),
	permissions: many(rolePermissions)
}));

/**
 * Relations for the Permissions table.
 */
export const permissionsRelations = relations(permissions, ({ many }) => ({
	roles: many(rolePermissions)
}));

/**
 * Relations for the Role-Permissions junction table.
 */
export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
	role: one(roles, {
		fields: [rolePermissions.roleId],
		references: [roles.id]
	}),
	permission: one(permissions, {
		fields: [rolePermissions.permissionId],
		references: [permissions.id]
	})
}));

/**
 * Relations for the Activity Logs table.
 */
export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
	admin: one(admins, {
		fields: [activityLogs.adminId],
		references: [admins.id]
	})
}));

/**
 * Relations for the Tokens table.
 */
export const tokensRelations = relations(tokens, ({ one, many }) => ({
	logo: one(assets, {
		fields: [tokens.logoId],
		references: [assets.id]
	}),
	createdBy: one(admins, {
		fields: [tokens.createdBy],
		references: [admins.id]
	}),
	updatedBy: one(admins, {
		fields: [tokens.updatedBy],
		references: [admins.id]
	}),
	tags: many(tokenTags)
}));

/**
 * Relations for the Posts table.
 */
export const postsRelations = relations(posts, ({ one, many }) => ({
	coverImage: one(assets, {
		fields: [posts.coverImageId],
		references: [assets.id]
	}),
	createdBy: one(admins, {
		fields: [posts.createdBy],
		references: [admins.id]
	}),
	updatedBy: one(admins, {
		fields: [posts.updatedBy],
		references: [admins.id]
	}),
	tags: many(postTags)
}));

/**
 * Relations for the Tags table.
 */
export const tagsRelations = relations(tags, ({ many }) => ({
	tokenTags: many(tokenTags),
	postTags: many(postTags)
}));

/**
 * Relations for the Token-Tags junction table.
 */
export const tokenTagsRelations = relations(tokenTags, ({ one }) => ({
	token: one(tokens, {
		fields: [tokenTags.tokenId],
		references: [tokens.id]
	}),
	tag: one(tags, {
		fields: [tokenTags.tagId],
		references: [tags.id]
	})
}));

/**
 * Relations for the Post-Tags junction table.
 */
export const postTagsRelations = relations(postTags, ({ one }) => ({
	post: one(posts, {
		fields: [postTags.postId],
		references: [posts.id]
	}),
	tag: one(tags, {
		fields: [postTags.tagId],
		references: [tags.id]
	})
}));

/**
 * Relations for the Assets table.
 */
export const assetsRelations = relations(assets, ({ one }) => ({
	createdBy: one(admins, {
		fields: [assets.createdBy],
		references: [admins.id]
	})
}));
