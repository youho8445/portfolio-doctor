import { Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MonitoringService } from './monitoring.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('notifications')
  async getNotifications(@Req() req: any) {
    return this.monitoringService.getUserEvents(req.user.id);
  }

  @Post('notifications/:id/read')
  async markRead(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    await this.monitoringService.markRead(id, req.user.id);
    return { ok: true };
  }

  @Post('notifications/read-all')
  async markAllRead(@Req() req: any) {
    await this.monitoringService.markAllRead(req.user.id);
    return { ok: true };
  }

  @Get('portfolios/:id/state-events')
  async getPortfolioEvents(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.monitoringService.getPortfolioEvents(id, req.user.id);
  }
}
