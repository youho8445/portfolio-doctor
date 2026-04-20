import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PricesService } from './prices.service';
import { CreatePriceDailyDto } from './dto/create-price-daily.dto';
import { CreateBenchmarkPriceDailyDto } from './dto/create-benchmark-price-daily.dto';

@Controller('prices')
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  @Post('security')
  createSecurityPrice(@Body() dto: CreatePriceDailyDto) {
    return this.pricesService.createSecurityPrice(dto);
  }

  @Post('benchmark')
  createBenchmarkPrice(@Body() dto: CreateBenchmarkPriceDailyDto) {
    return this.pricesService.createBenchmarkPrice(dto);
  }

  @Get('benchmarks')
  findAllBenchmarks() {
    return this.pricesService.findAllBenchmarks();
  }

  @Get('current')
  getCurrentPrices(@Query('ids') ids: string) {
    const securityIds = (ids ?? '').split(',').map(Number).filter((n) => !isNaN(n) && n > 0);
    return this.pricesService.getCurrentPrices(securityIds);
  }

  @Get('data-freshness')
  getDataFreshness() {
    return this.pricesService.getDataFreshness();
  }

  @Get('exchange-rate')
  getExchangeRate() {
    return this.pricesService.getExchangeRate();
  }
}
