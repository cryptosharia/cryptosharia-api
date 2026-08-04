// Use union string enum for error codes (e.g. 'A' | 'B' | 'C')
export type TasksErrorCode = 'NOT_FOUND' | 'SLUG_UNIQUE_VIOLATION';

export class TasksError extends Error {
  // Override the error name from 'Error' to 'TasksError'
  name = 'TasksError';

  constructor(public message: TasksErrorCode) {
    super(message);
  }
}
