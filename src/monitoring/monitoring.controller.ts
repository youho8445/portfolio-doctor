import { Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards, HttpCode } from '@nestjs/common';
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

  @Get('portfolios/:id/current-state')
  async getCurrentState(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.monitoringService.getCurrentState(id, req.user.id);
  }

  @Post('admin/monitoring/run-now')
  @HttpCode(200)
  async runMonitoringNow() {
    const checked = await this.monitoringService.runAllChecksNow();
    return { ok: true, checked };
  }
}
