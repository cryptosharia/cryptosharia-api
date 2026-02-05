import * as table from './tables';
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';
import z from '../zod-openapi';

// --- Entity Schemas (OpenAPI Ready) ---

// Permissions
export const Permission = createSelectSchema(table.permissions).openapi('Permission');
export type Permission = z.infer<typeof Permission>;

// Roles
export const Role = createSelectSchema(table.roles).openapi('Role');
export type Role = z.infer<typeof Role>;

// Admins
export const Admin = createSelectSchema(table.admins).openapi('Admin');
export type Admin = z.infer<typeof Admin>;

// Activity Logs
export const ActivityLog = createSelectSchema(table.activityLogs).openapi('ActivityLog');
export type ActivityLog = z.infer<typeof ActivityLog>;

// Assets
export const Asset = createSelectSchema(table.assets).openapi('Asset');
export type Asset = z.infer<typeof Asset>;

// ImgBB Images
export const ImgbbImage = createSelectSchema(table.imgbbImages).openapi('ImgbbImage');
export type ImgbbImage = z.infer<typeof ImgbbImage>;

// Tags
export const Tag = createSelectSchema(table.tags).openapi('Tag');
export type Tag = z.infer<typeof Tag>;

// Tokens
export const Token = createSelectSchema(table.tokens).openapi('Token');
export type Token = z.infer<typeof Token>;

// Posts
export const Post = createSelectSchema(table.posts).openapi('Post');
export type Post = z.infer<typeof Post>;

// --- Specialized Schemas (Custom Validation) ---

// Messages (Contact Form)
export const Message = createSelectSchema(table.messages).openapi('Message');
export type Message = z.infer<typeof Message>;

// --- Insert Schemas (For Write Operations) ---

export const InsertToken = createInsertSchema(table.tokens).openapi('InsertToken');
export type InsertToken = z.infer<typeof InsertToken>;

export const InsertPost = createInsertSchema(table.posts).openapi('InsertPost');
export type InsertPost = z.infer<typeof InsertPost>;

export const InsertAsset = createInsertSchema(table.assets).openapi('InsertAsset');
export type InsertAsset = z.infer<typeof InsertAsset>;

export const InsertMessage = createInsertSchema(table.messages, {
	name: (s) =>
		s
			.trim()
			.min(1, { message: 'Name cannot be empty' })
			.max(120, { message: 'Name must be at most 120 characters long' }),
	message: (s) =>
		s
			.min(10, { message: 'Message must be at least 10 characters long' })
			.max(5000, { message: 'Message must be at most 5000 characters long' })
})
	// Use extend to fix the z.string().email() deprecation
	.extend({
		email: z.email().max(255, { message: 'Email must be at most 255 characters long' })
	})
	.pick({
		name: true,
		email: true,
		message: true
	})
	.openapi('InsertMessage', {
		example: {
			name: 'Ngetes API',
			email: 'ngetes@wadidaw.uwu',
			message: 'Ngetes from\nCryptoSharia API'
		}
	});
export type InsertMessage = z.infer<typeof InsertMessage>;
