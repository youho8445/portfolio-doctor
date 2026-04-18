import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * 토스페이먼츠 결제 승인
   * 프론트 success 페이지에서 paymentKey/orderId/amount 수신 후 호출
   */
  @UseGuards(JwtAuthGuard)
  @Post('confirm')
  @HttpCode(200)
  async confirmPayment(
    @Req() req: { user: { id: number } },
    @Body() body: { paymentKey: string; orderId: string; amount: number; portfolioId: number },
  ) {
    const { paymentKey, orderId, amount, portfolioId } = body;
    const success = await this.paymentsService.confirmPayment(
      paymentKey,
      orderId,
      amount,
      portfolioId,
      req.user.id,
    );
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
}
