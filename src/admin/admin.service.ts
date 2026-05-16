import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AppSetting } from '../entities/app-setting.entity';
import { User } from '../entities/user.entity';
import { ConversionEvent } from '../entities/conversion-event.entity';

export type BillingMode = 'FREE' | 'SOFT_PAYWALL' | 'PAID';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AppSetting)
    private readonly settingRepo: Repository<AppSetting>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ConversionEvent)
    private readonly conversionRepo: Repository<ConversionEvent>,
  ) {}

  async getBillingMode(): Promise<BillingMode> {
    const setting = await this.settingRepo.findOne({ where: { key: 'billing_mode' } });
    return (setting?.value as BillingMode) ?? 'FREE';
  }

  async setBillingMode(mode: BillingMode): Promise<void> {
    await this.settingRepo.upsert({ key: 'billing_mode', value: mode }, ['key']);
  }

  async getUsers(): Promise<{ id: number; email: string | null; name: string | null; createdAt: Date; trialEndsAt: Date | null }[]> {
    const users = await this.userRepo.find({ order: { createdAt: 'DESC' } });
    return users.map((u) => ({ id: u.id, email: u.email, name: u.name, createdAt: u.createdAt, trialEndsAt: u.trialEndsAt ?? null }));
  }

  async changeUserPassword(userId: number, newPassword: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);
  }

  async grantTrial(userId: number, days: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + days);
    user.trialEndsAt = trialEndsAt;
    await this.userRepo.save(user);
  }

  async revokeTrial(userId: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');
    user.trialEndsAt = null;
    await this.userRepo.save(user);
  }

  async deleteUser(userId: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');
    await this.userRepo.remove(user);
  }

  async getPageTrafficStats() {
    const PAGE_EVENTS = ['page_view_landing', 'page_view_analyzer'];

    const [allTimeRows, last7dRows] = await Promise.all([
      this.conversionRepo.createQueryBuilder('e')
        .select('e.event', 'event')
        .addSelect('COUNT(*)', 'count')
        .where('e.event IN (:...events)', { events: PAGE_EVENTS })
        .groupBy('e.event')
        .getRawMany<{ event: string; count: string }>(),
      this.conversionRepo.createQueryBuilder('e')
        .select('e.event', 'event')
        .addSelect('COUNT(*)', 'count')
        .where('e.event IN (:...events)', { events: PAGE_EVENTS })
        .andWhere('e.createdAt >= :since', { since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) })
        .groupBy('e.event')
        .getRawMany<{ event: string; count: string }>(),
    ]);

    const toMap = (rows: { event: string; count: string }[]) =>
      rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.event]: Number(r.count) }), {});

    const all = toMap(allTimeRows);
    const d7  = toMap(last7dRows);

    return {
      allTime: PAGE_EVENTS.map((e) => ({ event: e, count: all[e] ?? 0 })),
      last7d:  PAGE_EVENTS.map((e) => ({ event: e, count: d7[e]  ?? 0 })),
    };
  }

  async getConversionStats() {
    const EVENTS = ['premium_modal_open', 'premium_cta_click', 'checkout_page_view', 'upgrade_attempt', 'payment_success'];

    const [allTimeRows, last7dRows] = await Promise.all([
      this.conversionRepo.createQueryBuilder('e')
        .select('e.event', 'event')
        .addSelect('COUNT(*)', 'count')
        .groupBy('e.event')
        .getRawMany<{ event: string; count: string }>(),
      this.conversionRepo.createQueryBuilder('e')
        .select('e.event', 'event')
        .addSelect('COUNT(*)', 'count')
        .where('e.createdAt >= :since', { since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) })
        .groupBy('e.event')
        .getRawMany<{ event: string; count: string }>(),
    ]);

    const toMap = (rows: { event: string; count: string }[]) =>
      rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.event]: Number(r.count) }), {});

    const all = toMap(allTimeRows);
    const d7  = toMap(last7dRows);
    const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null);

    return {
      allTime: EVENTS.map((e) => ({ event: e, count: all[e] ?? 0 })),
      last7d:  EVENTS.map((e) => ({ event: e, count: d7[e]  ?? 0 })),
      funnel: {
        ctaFromModal:       pct(all['premium_cta_click']    ?? 0, all['premium_modal_open']   ?? 0),
        checkoutFromCta:    pct(all['checkout_page_view']   ?? 0, all['premium_cta_click']    ?? 0),
        attemptFromCheckout:pct(all['upgrade_attempt']      ?? 0, all['checkout_page_view']   ?? 0),
        successFromCheckout:pct(all['payment_success']      ?? 0, all['checkout_page_view']   ?? 0),
      },
    };
  }
}
