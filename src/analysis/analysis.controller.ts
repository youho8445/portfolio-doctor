import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalyzePortfolioDto } from './dto/analyze-portfolio.dto';

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
