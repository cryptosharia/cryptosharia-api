import type { Context } from '#test/helpers/context.type';
import { activityLogs } from '#src/modules/drizzle/drizzle.schema';
import { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import { Suite } from '#test/helpers/suite.base';
import { createSession as createSessionFor } from '#test/helpers/create-session';
import { and, eq } from 'drizzle-orm';

export class UsersSuite extends Suite {
  constructor(ctx: Context) {
    super(ctx);
  }

  register() {
    const db = () => this.ctx.app.get(DrizzleService).db;
    const createSession = (
      email: string,
      role: 'admin' | 'member' | 'super_admin' = 'member',
    ) => createSessionFor(this.ctx, email, role);

    describe('Users', () => {
      describe('security', () => {
        it('rejects requests without an API key', async () => {
          const { response } = await this.ctx.clientWithoutApiKey.GET('/users');
          expect(response.status).toBe(401);
        });

        it('rejects requests without a bearer token', async () => {
          const { data, response } = await this.ctx.client.GET('/users');
          expect(response.status).toBe(401);
          expect(data).toBeUndefined();
        });
      });

      describe('selectAll', () => {
        it('lists users with pagination and exposes avatar metadata', async () => {
          const admin = await createSession('admin@example.com', 'super_admin');
          await createSession('member@example.com');

          const { data, response } = await this.ctx.client.GET('/users', {
            params: { query: { page: 1, limit: 1 } },
            headers: { authorization: `Bearer ${admin.accessToken}` },
          });

          expect(response.status).toBe(200);
          expect(response.headers.get('total-items')).toBe('2');
          expect(data).toHaveLength(1);
          expect(data?.[0]).not.toHaveProperty('avatarId');
          expect(data?.[0]).toHaveProperty('avatar');
          expect(data?.[0]?.avatar).toBeNull();
        });

        it('filters users by role and search term', async () => {
          const admin = await createSession('admin@example.com', 'super_admin');
          await createSession('member@example.com');

          const { data, response } = await this.ctx.client.GET('/users', {
            params: {
              query: {
                page: 1,
                limit: 20,
                roles: ['member'],
                search: 'member',
              },
            },
            headers: { authorization: `Bearer ${admin.accessToken}` },
          });

          expect(response.status).toBe(200);
          expect(data).toHaveLength(1);
          expect(data?.[0]).toMatchObject({
            email: 'member@example.com',
            role: 'member',
          });
        });
      });

      describe('selectById', () => {
        it('allows a member to retrieve their own profile', async () => {
          const member = await createSession('member@example.com');
          const { data, response } = await this.ctx.client.GET('/users/{id}', {
            params: { path: { id: member.user.id } },
            headers: { authorization: `Bearer ${member.accessToken}` },
          });

          expect(response.status).toBe(200);
          expect(data).toMatchObject({
            id: member.user.id,
            email: 'member@example.com',
            avatar: null,
          });
          expect(data).not.toHaveProperty('avatarId');
        });

        it('returns not found for an unknown user', async () => {
          const admin = await createSession('admin@example.com', 'super_admin');
          const { response } = await this.ctx.client.GET('/users/{id}', {
            params: { path: { id: crypto.randomUUID() } },
            headers: { authorization: `Bearer ${admin.accessToken}` },
          });
          expect(response.status).toBe(404);
        });
      });

      describe('update', () => {
        it('allows a member to update their own profile', async () => {
          const member = await createSession('member@example.com');
          const { data, response } = await this.ctx.client.PATCH(
            '/users/{id}',
            {
              params: { path: { id: member.user.id } },
              body: { name: 'Updated Member' },
              headers: { authorization: `Bearer ${member.accessToken}` },
            },
          );

          expect(response.status).toBe(200);
          expect(data).toMatchObject({ name: 'Updated Member' });
        });

        it('rejects a member from changing status or role', async () => {
          const member = await createSession('member@example.com');
          const status = await this.ctx.client.PATCH('/users/{id}', {
            params: { path: { id: member.user.id } },
            body: { status: 'suspended' },
            headers: { authorization: `Bearer ${member.accessToken}` },
          });
          expect(status.response.status).toBe(403);

          const role = await this.ctx.client.PATCH('/users/{id}', {
            params: { path: { id: member.user.id } },
            body: { role: 'posts_manager' },
            headers: { authorization: `Bearer ${member.accessToken}` },
          });
          expect(role.response.status).toBe(403);
        });

        it('rejects an admin from changing status or role', async () => {
          const admin = await createSession('admin@example.com', 'admin');
          const member = await createSession('member@example.com');
          const status = await this.ctx.client.PATCH('/users/{id}', {
            params: { path: { id: member.user.id } },
            body: { status: 'suspended' },
            headers: { authorization: `Bearer ${admin.accessToken}` },
          });
          expect(status.response.status).toBe(403);

          const role = await this.ctx.client.PATCH('/users/{id}', {
            params: { path: { id: member.user.id } },
            body: { role: 'posts_manager' },
            headers: { authorization: `Bearer ${admin.accessToken}` },
          });
          expect(role.response.status).toBe(403);
        });

        it('allows a super admin to change status and role', async () => {
          const admin = await createSession('admin@example.com', 'super_admin');
          const member = await createSession('member@example.com');
          const { data, response } = await this.ctx.client.PATCH(
            '/users/{id}',
            {
              params: { path: { id: member.user.id } },
              body: { status: 'suspended', role: 'posts_manager' },
              headers: { authorization: `Bearer ${admin.accessToken}` },
            },
          );
          expect(response.status).toBe(200);
          expect(data).toMatchObject({
            status: 'suspended',
            role: 'posts_manager',
          });

          const logs = await db()
            .select({
              action: activityLogs.action,
              description: activityLogs.description,
            })
            .from(activityLogs)
            .where(
              and(
                eq(activityLogs.userId, admin.user.id),
                eq(activityLogs.subjectId, member.user.id),
                eq(activityLogs.action, 'user.update'),
              ),
            );
          expect(logs).toHaveLength(1);
          expect(logs[0]?.description).toBe('Update user fields: status, role');
        });

        it('rejects an empty update', async () => {
          const member = await createSession('member@example.com');
          const { error, response } = await this.ctx.client.PATCH(
            '/users/{id}',
            {
              params: { path: { id: member.user.id } },
              body: {},
              headers: { authorization: `Bearer ${member.accessToken}` },
            },
          );
          expect(response.status).toBe(422);
          expect(error?.error).toBe('VALIDATION_FAILED');
          expect(
            (error as { details?: { root?: string[] } } | undefined)?.details
              ?.root,
          ).toContain('Minimal satu field wajib diisi');
        });
      });
    });
  }
}
