import { Injectable, Logger } from '@nestjs/common';
import type { ActivityLog } from '#src/modules/drizzle/drizzle.types';
import { AuditRepository } from './audit.repository';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly auditRepository: AuditRepository) {}

  async log(input: {
    userId?: ActivityLog['userId'];
    action: ActivityLog['action'];
    subjectType: ActivityLog['subjectType'];
    subjectId?: ActivityLog['subjectId'];
    description?: ActivityLog['description'];
    ipAddress?: ActivityLog['ipAddress'];
  }): Promise<void> {
    try {
      await this.auditRepository.insert(input);
    } catch {
      // Audit persistence is best-effort and must not roll back the caller's successful action.
      this.logger.error(`Gagal mencatat aktivitas: ${input.action}`);
    }
  }
}
