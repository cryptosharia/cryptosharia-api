import { Module } from '@nestjs/common';
import { DrizzleModule } from '#src/modules/drizzle/drizzle.module';
import { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';

@Module({
  imports: [DrizzleModule],
  providers: [AuditRepository, AuditService],
  exports: [AuditService],
})
export class AuditModule {}
