import { Controller, Get } from '@nestjs/common';

@Controller()
export class SystemController {
  @Get('health')
  health() {
    return { status: 'UP' };
  }
}
