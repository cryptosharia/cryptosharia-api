import { Module } from '@nestjs/common';
import { DrizzleModule } from '#src/modules/drizzle/drizzle.module';
import { AcademyAdminController } from './academy-admin.controller';
import { AcademyController } from './academy.controller';
import { AcademyRepository } from './academy.repository';
import { AcademyService } from './academy.service';

@Module({
  imports: [DrizzleModule],
  controllers: [AcademyController, AcademyAdminController],
  providers: [AcademyRepository, AcademyService],
  exports: [AcademyRepository, AcademyService],
})
export class AcademyModule {}
