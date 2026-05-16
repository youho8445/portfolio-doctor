import { Body, Controller, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalysisService } from './analysis.service';
import { AnalyzePortfolioDto, GuestAnalysisDto } from './dto/analyze-portfolio.dto';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @UseGuards(JwtAuthGuard)
  @Post('portfolios/:id')
  analyze(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnalyzePortfolioDto,
    @Req() req: { user: { id: number } },
  ) {
    return this.analysisService.analyzePortfolio(
      id,
      dto.period ?? '1Y',
      dto.benchmarkCode ?? 'SP500',
      req.user.id,
    );
  }

  @UseGuards(ThrottlerGuard)
  @Post('guest')
  analyzeGuest(@Body() dto: GuestAnalysisDto) {
    return this.analysisService.analyzeGuest(dto.items);
  }
}
