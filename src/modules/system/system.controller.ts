import { Controller, Get } from '@nestjs/common';
import { Public } from '#src/common/public.decorator';

@Controller()
export class SystemController {
  @Public()
  @Get('health')
  health() {
    return { status: 'UP' };
  }
}
