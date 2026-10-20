import { Module } from '@nestjs/common';
import { DrizzleModule } from '#src/modules/drizzle/drizzle.module';
import { WebsiteSettingsController } from './website-settings.controller';
import { WebsiteSettingsService } from './website-settings.service';

@Module({
  imports: [DrizzleModule],
  controllers: [WebsiteSettingsController],
  providers: [WebsiteSettingsService],
})
export class WebsiteSettingsModule {}
