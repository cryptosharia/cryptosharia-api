import { TasksService } from './tasks.service';
import { Task, User } from '#src/modules/drizzle/drizzle.types';
import { TasksRepository } from './tasks.repository';
import { TasksError } from './tasks.error';

class MockTasksRepository {
  selectAll = vi.fn();
  selectById = vi.fn();
  insert = vi.fn();
  update = vi.fn();
  delete = vi.fn();
}

const mockUser: User = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashed_password_placeholder',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTask: Task = {
  id: 'task-1',
  title: 'Test task',
  slug: 'test-task',
  description: null,
  status: 'pending' as const,
  userId: mockUser.id,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('TasksService', () => {
  let tasksRepository: MockTasksRepository;
  let tasksService: TasksService;

  beforeEach(() => {
    tasksRepository = new MockTasksRepository();
    tasksService = new TasksService(
      tasksRepository as unknown as TasksRepository,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('selectAll', () => {
    it('returns all tasks for the given user', async () => {
      tasksRepository.selectAll.mockResolvedValue([mockTask]);

      const result = await tasksService.selectAll(mockUser.id);

      expect(result).toEqual([mockTask]);
      expect(tasksRepository.selectAll).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('selectById', () => {
    it('returns a task by id if owned by the user', async () => {
      tasksRepository.selectById.mockResolvedValue(mockTask);

      const result = await tasksService.selectById(mockTask.id, mockUser.id);

      expect(result).toEqual(mockTask);
      expect(tasksRepository.selectById).toHaveBeenCalledWith(
        mockTask.id,
        mockUser.id,
      );
    });

    it('propagates error from repository', async () => {
      const error = new TasksError('NOT_FOUND');
      tasksRepository.selectById.mockRejectedValue(error);

      await expect(
        tasksService.selectById('nonexistent', mockUser.id),
      ).rejects.toThrow(error);

      expect(tasksRepository.selectById).toHaveBeenCalledWith(
        'nonexistent',
        mockUser.id,
      );
    });
  });

  describe('insert', () => {
    it('inserts with userId merged into data', async () => {
      tasksRepository.insert.mockResolvedValue(mockTask);

      const data = { title: 'New task', slug: 'new-task', description: null };
      const result = await tasksService.insert(mockUser.id, data);

      expect(result).toEqual(mockTask);
      expect(tasksRepository.insert).toHaveBeenCalledWith({
        ...data,
        userId: mockUser.id,
      });
    });
  });

  describe('update', () => {
    it('updates a task owned by the user', async () => {
      const data = { title: 'Updated' };
      tasksRepository.update.mockResolvedValue(mockTask);

      const result = await tasksService.update(mockTask.id, mockUser.id, data);

      expect(result).toEqual(mockTask);
      expect(tasksRepository.update).toHaveBeenCalledWith(
        mockTask.id,
        mockUser.id,
        data,
      );
    });
  });

  describe('delete', () => {
    it('deletes a task owned by the user', async () => {
      tasksRepository.delete.mockResolvedValue(undefined);

      const result = await tasksService.delete(mockTask.id, mockUser.id);

      expect(result).toEqual(undefined);
      expect(tasksRepository.delete).toHaveBeenCalledWith(
        mockTask.id,
        mockUser.id,
      );
    });
  });
});
