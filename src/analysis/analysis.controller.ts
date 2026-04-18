import { Body, Controller, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalysisService } from './analysis.service';
import { AnalyzePortfolioDto } from './dto/analyze-portfolio.dto';

@UseGuards(JwtAuthGuard)
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('portfolios/:id')
  analyze(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnalyzePortfolioDto,
  ) {
    return this.analysisService.analyzePortfolio(
      id,
      dto.period ?? '1Y',
      dto.benchmarkCode ?? 'SP500',
    );
  }
}
