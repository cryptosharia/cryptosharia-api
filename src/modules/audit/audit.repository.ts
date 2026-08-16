import { Injectable } from '@nestjs/common';
import { activityLogs } from '#src/modules/drizzle/drizzle.schema';
import type { ActivityLog } from '#src/modules/drizzle/drizzle.types';
import { DrizzleService } from '#src/modules/drizzle/drizzle.service';

@Injectable()
export class AuditRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async insert(input: {
    userId?: ActivityLog['userId'];
    action: ActivityLog['action'];
    subjectType: ActivityLog['subjectType'];
    subjectId?: ActivityLog['subjectId'];
    description?: ActivityLog['description'];
    ipAddress?: ActivityLog['ipAddress'];
  }): Promise<void> {
    await this.drizzleService.db.insert(activityLogs).values(input);
  }
}
