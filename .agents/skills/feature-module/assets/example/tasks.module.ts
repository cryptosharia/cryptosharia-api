import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repository';
import { AuthModule } from '#src/modules/auth/auth.module';
import { DrizzleModule } from '#src/modules/drizzle/drizzle.module';

@Module({
  imports: [AuthModule, DrizzleModule],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository],
  exports: [TasksService],
})
export class TasksModule {}
