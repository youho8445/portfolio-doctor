import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PremiumUnlock } from '../entities/premium-unlock.entity';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const StripeLib = require('stripe');

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly stripe: any;

  constructor(
    @InjectRepository(PremiumUnlock)
    private readonly unlockRepo: Repository<PremiumUnlock>,
  ) {
    const key = process.env.STRIPE_SECRET_KEY;
    this.stripe = key ? new StripeLib(key) : null;
  }

  async createCheckoutSession(portfolioId: number, userId: number): Promise<string> {
    if (!this.stripe) throw new Error('Stripe not configured');
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'krw',
            unit_amount: 2900,
            product_data: {
              name: '포트폴리오 상세 리밸런싱 가이드',
              description: '구체적 비율 · Before/After 시뮬레이션 · 미래 리스크 분석',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        portfolioId: String(portfolioId),
        userId: String(userId),
      },
      success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&portfolioId=${portfolioId}`,
      cancel_url: `${frontendUrl}/analyzer`,
    });

    return session.url;
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!this.stripe) throw new Error('Stripe not configured');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';
    let event: any; // eslint-disable-line @typescript-eslint/no-explicit-any

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (e) {
      this.logger.error(`Webhook 서명 검증 실패: ${e}`);
      throw new Error('Invalid webhook signature');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const portfolioId = Number(session.metadata?.portfolioId);
      const userId = Number(session.metadata?.userId);

      if (portfolioId && userId && session.id) {
        const existing = await this.unlockRepo.findOne({ where: { stripeSessionId: session.id } });
        if (!existing) {
          const unlock = this.unlockRepo.create({ userId, portfolioId, stripeSessionId: session.id });
          await this.unlockRepo.save(unlock);
          this.logger.log(`[UNLOCK] userId=${userId} portfolioId=${portfolioId}`);
        }
      }
    }
  }

  async isUnlocked(portfolioId: number, userId: number): Promise<boolean> {
    const unlock = await this.unlockRepo.findOne({ where: { portfolioId, userId } });
    return !!unlock;
  }

  async verifySession(sessionId: string, portfolioId: number, userId: number): Promise<boolean> {
    if (!this.stripe) return false;
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') return false;
      if (Number(session.metadata?.portfolioId) !== portfolioId) return false;

      const existing = await this.unlockRepo.findOne({ where: { stripeSessionId: sessionId } });
      if (!existing) {
        const unlock = this.unlockRepo.create({ userId, portfolioId, stripeSessionId: sessionId });
        await this.unlockRepo.save(unlock);
      }
      return true;
    } catch (e) {
      this.logger.error(`Session 검증 실패: ${e}`);
      return false;
    }
  }
}
