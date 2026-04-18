import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /** Stripe Checkout 세션 생성 → URL 반환 */
  @UseGuards(JwtAuthGuard)
  @Post('checkout/:portfolioId')
  async createCheckout(
    @Param('portfolioId', ParseIntPipe) portfolioId: number,
    @Req() req: { user: { id: number } },
  ) {
    const url = await this.paymentsService.createCheckoutSession(portfolioId, req.user.id);
    return { url };
  }

  /** 결제 완료 후 세션 검증 (success 페이지에서 호출) */
  @UseGuards(JwtAuthGuard)
  @Post('verify')
  async verifySession(
    @Req() req: { user: { id: number }; body: { sessionId: string; portfolioId: number } },
  ) {
    const { sessionId, portfolioId } = req.body as { sessionId: string; portfolioId: number };
    const success = await this.paymentsService.verifySession(sessionId, portfolioId, req.user.id);
    return { success };
  }

  /** 프리미엄 잠금 해제 여부 확인 */
  @UseGuards(JwtAuthGuard)
  @Get('status/:portfolioId')
  async getStatus(
    @Param('portfolioId', ParseIntPipe) portfolioId: number,
    @Req() req: { user: { id: number } },
  ) {
    const unlocked = await this.paymentsService.isUnlocked(portfolioId, req.user.id);
    return { unlocked };
  }

  /** Stripe Webhook (인증 없음 — raw body 필요) */
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.paymentsService.handleWebhook(req.rawBody!, signature);
    return { received: true };
  }
}
