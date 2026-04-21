import { Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { SecuritiesService } from './securities.service';
import { CreateSecurityDto } from './dto/create-security.dto';

@Controller('securities')
export class SecuritiesController {
  constructor(private readonly securitiesService: SecuritiesService) {}

  @Post()
  create(@Body() dto: CreateSecurityDto) {
    return this.securitiesService.create(dto);
  }

  @Get()
  findAll(@Query('q') q?: string) {
    return this.securitiesService.search(q);
  }

  @Get(':ticker/quote')
  async getQuote(@Param('ticker') ticker: string) {
    const data = await this.securitiesService.getTickerQuote(ticker);
    if (!data) throw new NotFoundException(`No data for ${ticker}`);
    return data;
  }
}
