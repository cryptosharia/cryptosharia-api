export const TASKS_ERRORS = {
  TASK_NOT_FOUND: 'Task not found',
  SLUG_UNIQUE_VIOLATION: 'Task slug already exists',
} as const;

export type TasksErrorCode = keyof typeof TASKS_ERRORS;

export class TasksError extends Error {
  name = 'TasksError';

  constructor(public code: TasksErrorCode) {
    super(TASKS_ERRORS[code]);
  }
}
