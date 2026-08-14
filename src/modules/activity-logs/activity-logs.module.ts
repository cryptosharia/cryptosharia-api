import { Module } from '@nestjs/common';
import { DrizzleModule } from '#src/modules/drizzle/drizzle.module';
import { ActivityLogsRepository } from './activity-logs.repository';
import { ActivityLogsService } from './activity-logs.service';

@Module({
  imports: [DrizzleModule],
  providers: [ActivityLogsRepository, ActivityLogsService],
  exports: [ActivityLogsService],
})
export class ActivityLogsModule {}
