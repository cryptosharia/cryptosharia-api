import { Module } from '@nestjs/common';
import { DrizzleModule } from '#src/modules/drizzle/drizzle.module';
import { AcademyRepository } from './academy.repository';
import { AcademyService } from './academy.service';

@Module({
  imports: [DrizzleModule],
  providers: [AcademyRepository, AcademyService],
  exports: [AcademyRepository, AcademyService],
})
export class AcademyModule {}
