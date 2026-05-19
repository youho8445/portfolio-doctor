import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { FeedbackService, ALLOWED_REASONS, VALID_RATINGS, VALID_PAGES } from './feedback.service';

class SubmitFeedbackDto {
  @IsString()
  @MaxLength(64)
  @IsOptional()
  sessionId?: string | null;

  @IsString()
  @MaxLength(64)
  @IsOptional()
  analysisId?: string | null;

  @IsIn(VALID_PAGES)
  page!: string;

  @IsIn(VALID_RATINGS)
  rating!: string;

  @IsArray()
  @IsIn(ALLOWED_REASONS, { each: true })
  @ArrayMaxSize(10)
  @IsOptional()
  reasons?: string[] | null;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  message?: string | null;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  healthScore?: number | null;

  @IsBoolean()
  @IsOptional()
  isGuest?: boolean;
}

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get('check')
  @UseGuards(OptionalJwtAuthGuard)
  async checkSubmitted(
    @Req() req: { user?: { id?: number } },
  ): Promise<{ submitted: boolean }> {
    const userId = req.user?.id ?? null;
    if (!userId) return { submitted: false };
    return { submitted: await this.feedbackService.hasUserSubmitted(userId) };
  }

  @Post()
  @HttpCode(204)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(OptionalJwtAuthGuard)
  async submit(
    @Body() dto: SubmitFeedbackDto,
    @Req() req: { user?: { id?: number; email?: string } },
  ): Promise<void> {
    const userId = req.user?.id ?? null;
    const isGuest = dto.isGuest ?? userId === null;

    await this.feedbackService.submit({
      userId,
      sessionId: dto.sessionId,
      analysisId: dto.analysisId,
      page: dto.page,
      rating: dto.rating,
      reasons: dto.reasons,
      message: dto.message,
      healthScore: dto.healthScore,
      isGuest,
    });
  }
}
