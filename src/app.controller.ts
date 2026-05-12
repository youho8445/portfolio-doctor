import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return { status: 'ok', service: 'pobalance-api' };
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'pobalance-api' };
  }
}
