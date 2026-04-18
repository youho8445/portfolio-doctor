import { Controller, Get, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HistoryService } from './history.service';

@UseGuards(JwtAuthGuard)
@Controller('portfolios')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get(':id/history')
  getHistory(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { id: number } },
  ) {
    return this.historyService.getHistory(id, req.user.id);
  }
}
