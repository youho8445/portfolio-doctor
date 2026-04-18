import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PremiumUnlock } from '../entities/premium-unlock.entity';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly secretKey: string;

  constructor(
    @InjectRepository(PremiumUnlock)
    private readonly unlockRepo: Repository<PremiumUnlock>,
  ) {
    this.secretKey = process.env.TOSS_SECRET_KEY ?? '';
  }

  /**
   * 토스페이먼츠 결제 승인 + 언락 저장
   * 프론트 success 페이지에서 paymentKey / orderId / amount 수신 후 호출
   */
  async confirmPayment(
    paymentKey: string,
    orderId: string,
    amount: number,
    portfolioId: number,
    userId: number,
  ): Promise<boolean> {
    if (!this.secretKey) {
      this.logger.warn('TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.');
      return false;
    }

    try {
      const encoded = Buffer.from(`${this.secretKey}:`).toString('base64');
      const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${encoded}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentKey, orderId, amount }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        this.logger.error(`Toss 결제 승인 실패: ${JSON.stringify(err)}`);
        return false;
      }

      // 중복 저장 방지
      const existing = await this.unlockRepo.findOne({ where: { stripeSessionId: orderId } });
      if (!existing) {
        const unlock = this.unlockRepo.create({ userId, portfolioId, stripeSessionId: orderId });
        await this.unlockRepo.save(unlock);
        this.logger.log(`[UNLOCK] userId=${userId} portfolioId=${portfolioId}`);
      }
      return true;
    } catch (e) {
      this.logger.error(`결제 확인 실패: ${e}`);
      return false;
    }
  }

  async isUnlocked(portfolioId: number, userId: number): Promise<boolean> {
    const unlock = await this.unlockRepo.findOne({ where: { portfolioId, userId } });
    return !!unlock;
  }
}
