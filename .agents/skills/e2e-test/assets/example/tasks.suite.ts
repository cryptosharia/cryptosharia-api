import type { Context } from '#test/helpers/context.type';
import { Suite } from '#test/helpers/suite.base';
import { AuthService } from '#test/helpers/auth.service';
import type { paths } from '#test/schema';

const taskUser = {
  name: 'Task User',
  email: 'task-user@example.test',
  password: 'password12345',
};

const otherUser = {
  name: 'Other User',
  email: 'other-user@example.test',
  password: 'password12345',
};

type CreateTaskBody = NonNullable<
  paths['/tasks']['post']['requestBody']
>['content']['application/json'];
type UpdateTaskBody = NonNullable<
  paths['/tasks/{id}']['put']['requestBody']
>['content']['application/json'];

export class TaskSuite extends Suite {
  constructor(
    ctx: Context,
    private readonly authService: AuthService,
  ) {
    super(ctx);
  }

  register() {
    const createTask = (token: string | null, body: CreateTaskBody) =>
      this.ctx.client.POST('/tasks', {
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
        body,
      });

    const listTasks = (token?: string) =>
      this.ctx.client.GET(
        '/tasks',
        token ? { headers: { authorization: `Bearer ${token}` } } : undefined,
      );

    const getTask = (id: string, token?: string) =>
      this.ctx.client.GET('/tasks/{id}', {
        params: { path: { id } },
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      });

    const updateTask = (
      id: string,
      token: string | null,
      body: UpdateTaskBody,
    ) =>
      this.ctx.client.PUT('/tasks/{id}', {
        params: { path: { id } },
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
        body,
      });

    const deleteTask = (id: string, token: string | null) =>
      this.ctx.client.DELETE('/tasks/{id}', {
        params: { path: { id } },
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      });

    describe('Tasks', () => {
      let token: string;
      let otherToken: string;

      beforeEach(async () => {
        const { data } = await this.authService.signUp(taskUser);
        token = data!.accessToken;

        const { data: otherData } = await this.authService.signUp(otherUser);
        otherToken = otherData!.accessToken;
      });

      describe('create', () => {
        it('should create a task', async () => {
          const { data, response } = await createTask(token, {
            title: 'My task',
            slug: 'my-task',
            description: null,
          });

          expect(response.status).toBe(201);
          expect(data?.id).toBeDefined();
          expect(data?.title).toBe('My task');
          expect(data?.slug).toBe('my-task');
        });

        it('should reject duplicate slug', async () => {
          await createTask(token, {
            title: 'My task',
            slug: 'duplicate-task',
            description: null,
          });

          const { response } = await createTask(token, {
            title: 'Other task',
            slug: 'duplicate-task',
            description: null,
          });

          expect(response.status).toBe(409);
        });

        it('should reject unauthenticated', async () => {
          const { response } = await createTask(null, {
            title: 'My task',
            slug: 'my-task',
          } as CreateTaskBody);

          expect(response.status).toBe(401);
        });

        it('should reject missing title', async () => {
          const { response } = await createTask(token, {
            slug: 'missing-title',
            description: null,
          } as CreateTaskBody);

          expect(response.status).toBe(422);
        });

        it('should reject empty title', async () => {
          const { response } = await createTask(token, {
            title: '',
            slug: 'empty-title',
            description: null,
          });

          expect(response.status).toBe(422);
        });

        it('should reject missing description key', async () => {
          const { response } = await createTask(token, {
            title: 'No desc key',
            slug: 'no-desc-key',
          } as CreateTaskBody);

          expect(response.status).toBe(422);
        });

        it('should reject description too long', async () => {
          const { response } = await createTask(token, {
            title: 'Valid title',
            slug: 'long-description',
            description: 'x'.repeat(1001),
          });

          expect(response.status).toBe(422);
        });
      });

      describe('selectAll', () => {
        it('should return empty array when no tasks exist', async () => {
          const { data, response } = await listTasks(token);

          expect(response.status).toBe(200);
          expect(data).toEqual([]);
        });

        it('should return only own tasks', async () => {
          await createTask(token, {
            title: 'My task',
            slug: 'my-task',
            description: null,
          });

          const { data, response } = await listTasks(otherToken);

          expect(response.status).toBe(200);
          expect(data).toHaveLength(0);
        });

        it('should reject unauthenticated', async () => {
          const { response } = await listTasks();

          expect(response.status).toBe(401);
        });
      });

      describe('selectById', () => {
        it('should return a task by id', async () => {
          const { data: created } = await createTask(token, {
            title: 'My task',
            slug: 'my-task',
            description: null,
          });

          const { data, response } = await getTask(created!.id, token);

          expect(response.status).toBe(200);
          expect(data?.id).toBe(created!.id);
          expect(data?.title).toBe('My task');
        });

        it('should reject unauthenticated', async () => {
          const { response } = await getTask(crypto.randomUUID());

          expect(response.status).toBe(401);
        });

        it('should return 404 when task does not exist', async () => {
          const { response } = await getTask(crypto.randomUUID(), token);

          expect(response.status).toBe(404);
        });

        it('should return 422 for an invalid task id', async () => {
          const { response } = await getTask('not-a-uuid', token);

          expect(response.status).toBe(422);
        });

        it('should return 404 for another users task', async () => {
          const { data: created } = await createTask(token, {
            title: 'My task',
            slug: 'my-task',
            description: null,
          });

          const { response } = await getTask(created!.id, otherToken);

          expect(response.status).toBe(404);
        });
      });

      describe('update', () => {
        it('should update a task title', async () => {
          const { data: created } = await createTask(token, {
            title: 'Original title',
            slug: 'original-title',
            description: null,
          });

          const { data, response } = await updateTask(created!.id, token, {
            title: 'Updated title',
          });

          expect(response.status).toBe(200);
          expect(data?.title).toBe('Updated title');
        });

        it('should reject unauthenticated', async () => {
          const { response } = await updateTask(crypto.randomUUID(), null, {
            title: 'Updated title',
          });

          expect(response.status).toBe(401);
        });

        it('should update a task description', async () => {
          const { data: created } = await createTask(token, {
            title: 'Desc test',
            slug: 'desc-test',
            description: null,
          });

          const { data, response } = await updateTask(created!.id, token, {
            description: 'New description',
          });

          expect(response.status).toBe(200);
          expect(data?.description).toBe('New description');
        });

        it('should reject update by another user', async () => {
          const { data: created } = await createTask(token, {
            title: 'Not yours',
            slug: 'not-yours',
            description: null,
          });

          const { response } = await updateTask(created!.id, otherToken, {
            title: 'Hacked',
          });

          expect(response.status).toBe(404);
        });

        it('should reject empty title', async () => {
          const { data: created } = await createTask(token, {
            title: 'Valid',
            slug: 'valid-title',
            description: null,
          });

          const { response } = await updateTask(created!.id, token, {
            title: '',
          });

          expect(response.status).toBe(422);
        });

        it('should return 404 when task does not exist', async () => {
          const { response } = await updateTask(crypto.randomUUID(), token, {
            title: 'Updated title',
          });

          expect(response.status).toBe(404);
        });

        it('should return 422 for an invalid task id', async () => {
          const { response } = await updateTask('not-a-uuid', token, {
            title: 'Updated title',
          });

          expect(response.status).toBe(422);
        });
      });

      describe('delete', () => {
        it('should delete a task', async () => {
          const { data: created } = await createTask(token, {
            title: 'To delete',
            slug: 'to-delete',
            description: null,
          });

          const { response } = await deleteTask(created!.id, token);

          expect(response.status).toBe(204);

          const { response: getResponse } = await getTask(created!.id, token);

          expect(getResponse.status).toBe(404);
        });

        it('should reject unauthenticated', async () => {
          const { response } = await deleteTask(crypto.randomUUID(), null);

          expect(response.status).toBe(401);
        });

        it('should reject delete by another user', async () => {
          const { data: created } = await createTask(token, {
            title: 'To delete',
            slug: 'to-delete-other',
            description: null,
          });

          const { response } = await deleteTask(created!.id, otherToken);

          expect(response.status).toBe(404);
        });

        it('should return 404 when task does not exist', async () => {
          const { response } = await deleteTask(crypto.randomUUID(), token);

          expect(response.status).toBe(404);
        });

        it('should return 422 for an invalid task id', async () => {
          const { response } = await deleteTask('not-a-uuid', token);

          expect(response.status).toBe(422);
        });
      });
    });
  }
}
