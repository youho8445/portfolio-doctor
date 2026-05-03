import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return { status: 'ok', service: 'portra-ai-api' };
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'portra-ai-api' };
  }
}
