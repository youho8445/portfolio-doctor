import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { MarketService } from './market.service';

@Controller('market')
@SkipThrottle()
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('indices')
  getIndices() {
    return this.marketService.getIndices();
  }
}
