import { Injectable, Logger } from '@nestjs/common';
import type { ActivityLog } from '#src/modules/drizzle/drizzle.types';
import { ActivityLogsRepository } from './activity-logs.repository';

@Injectable()
export class ActivityLogsService {
  private readonly logger = new Logger(ActivityLogsService.name);

  constructor(
    private readonly activityLogsRepository: ActivityLogsRepository,
  ) {}

  async log(input: {
    userId?: ActivityLog['userId'];
    action: ActivityLog['action'];
    subjectType: ActivityLog['subjectType'];
    subjectId?: ActivityLog['subjectId'];
    description?: ActivityLog['description'];
    ipAddress?: ActivityLog['ipAddress'];
  }): Promise<void> {
    try {
      await this.activityLogsRepository.insert(input);
    } catch {
      // Audit persistence is best-effort and must not roll back the caller's successful action.
      this.logger.error(`Failed to log activity: ${input.action}`);
    }
  }
}
