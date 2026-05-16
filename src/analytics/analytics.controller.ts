import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IsIn, IsNumber, IsOptional } from 'class-validator';
import { AnalyticsService } from './analytics.service';

const VALID_EVENTS = [
  'premium_modal_open',
  'premium_cta_click',
  'checkout_page_view',
  'upgrade_attempt',
  'payment_success',
  'page_view_landing',
  'page_view_analyzer',
  'analysis_run',
  'page_view_login',
  'page_view_register',
  'guest_analysis_started',
  'guest_analysis_completed',
  'guest_signup_gate_viewed',
  'guest_signup_clicked',
] as const;

class TrackEventDto {
  @IsIn(VALID_EVENTS)
  event!: string;

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
