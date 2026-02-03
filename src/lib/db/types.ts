import * as schema from './tables';
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';
import z from '../zod-openapi';

// --- Entity Schemas (OpenAPI Ready) ---

// Permissions
export const Permission = createSelectSchema(schema.permissions).openapi('Permission');
export type Permission = z.infer<typeof Permission>;

// Roles
export const Role = createSelectSchema(schema.roles).openapi('Role');
export type Role = z.infer<typeof Role>;

// Admins
export const Admin = createSelectSchema(schema.admins).openapi('Admin');
export type Admin = z.infer<typeof Admin>;

// Activity Logs
export const ActivityLog = createSelectSchema(schema.activityLogs).openapi('ActivityLog');
export type ActivityLog = z.infer<typeof ActivityLog>;

// Assets
export const Asset = createSelectSchema(schema.assets).openapi('Asset');
export type Asset = z.infer<typeof Asset>;

// Tags
export const Tag = createSelectSchema(schema.tags).openapi('Tag');
export type Tag = z.infer<typeof Tag>;

// Tokens
export const Token = createSelectSchema(schema.tokens).openapi('Token');
export type Token = z.infer<typeof Token>;

// Posts
export const Post = createSelectSchema(schema.posts).openapi('Post');
export type Post = z.infer<typeof Post>;

// --- Specialized Schemas (Custom Validation) ---

// Messages (Contact Form)
export const Message = createSelectSchema(schema.messages).openapi('Message');
export type Message = z.infer<typeof Message>;

// --- Insert Schemas (For Write Operations) ---

export const InsertToken = createInsertSchema(schema.tokens).openapi('InsertToken');
export type InsertToken = z.infer<typeof InsertToken>;

export const InsertPost = createInsertSchema(schema.posts).openapi('InsertPost');
export type InsertPost = z.infer<typeof InsertPost>;

export const InsertAsset = createInsertSchema(schema.assets).openapi('InsertAsset');
export type InsertAsset = z.infer<typeof InsertAsset>;

export const InsertMessage = createInsertSchema(schema.messages, {
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
			name: 'Daffa Ilhami',
			email: 'mdaffailhami@gmail.com',
			message: 'Hello, I have a question about...'
		}
	});
export type InsertMessage = z.infer<typeof InsertMessage>;
