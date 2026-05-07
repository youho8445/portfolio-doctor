import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IsIn, IsNumber, IsOptional } from 'class-validator';
import { AnalyticsService } from './analytics.service';

const VALID_EVENTS = [
  'premium_modal_open',
  'premium_cta_click',
  'checkout_page_view',
  'upgrade_attempt',
  'payment_success',
] as const;

class TrackEventDto {
  @IsIn(VALID_EVENTS)
  event: string;

  @IsNumber()
  @IsOptional()
  userId?: number | null;
}

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('event')
  @HttpCode(204)
  async track(@Body() dto: TrackEventDto): Promise<void> {
    await this.analyticsService.track(dto.event, dto.userId ?? null);
  }
}
