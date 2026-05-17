import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AppSetting } from '../entities/app-setting.entity';
import { User } from '../entities/user.entity';
import { ConversionEvent } from '../entities/conversion-event.entity';
import { isAdminEmail } from './admin-email.helper';

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

  private async getAdminUserIds(): Promise<number[]> {
    const users = await this.userRepo.find({ select: ['id', 'email'] });
    return users.filter((u) => isAdminEmail(u.email)).map((u) => u.id);
  }

  async getPageTrafficStats() {
    const PAGE_EVENTS = ['page_view_landing', 'page_view_analyzer', 'analysis_run', 'checkout_page_view', 'payment_success'];

    // KST 자정 (UTC+9 → 전날 15:00 UTC)
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    kstNow.setUTCHours(0, 0, 0, 0);
    const todayStart = new Date(kstNow.getTime() - 9 * 60 * 60 * 1000);

    const adminIds = await this.getAdminUserIds();
    const excludeAdmin = (qb: ReturnType<typeof this.conversionRepo.createQueryBuilder>) =>
      adminIds.length > 0
        ? qb.andWhere('(e.userId IS NULL OR e.userId NOT IN (:...adminIds))', { adminIds })
        : qb;

    const [allTimeRows, last7dRows, todayRows] = await Promise.all([
      excludeAdmin(this.conversionRepo.createQueryBuilder('e')
        .select('e.event', 'event')
        .addSelect('COUNT(*)', 'count')
        .where('e.event IN (:...events)', { events: PAGE_EVENTS })
        .groupBy('e.event'))
        .getRawMany<{ event: string; count: string }>(),
      excludeAdmin(this.conversionRepo.createQueryBuilder('e')
        .select('e.event', 'event')
        .addSelect('COUNT(*)', 'count')
        .where('e.event IN (:...events)', { events: PAGE_EVENTS })
        .andWhere('e.createdAt >= :since', { since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) })
        .groupBy('e.event'))
        .getRawMany<{ event: string; count: string }>(),
      excludeAdmin(this.conversionRepo.createQueryBuilder('e')
        .select('e.event', 'event')
        .addSelect('COUNT(*)', 'count')
        .where('e.event IN (:...events)', { events: PAGE_EVENTS })
        .andWhere('e.createdAt >= :since', { since: todayStart })
        .groupBy('e.event'))
        .getRawMany<{ event: string; count: string }>(),
    ]);

    const toMap = (rows: { event: string; count: string }[]) =>
      rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.event]: Number(r.count) }), {});

    const all   = toMap(allTimeRows);
    const d7    = toMap(last7dRows);
    const today = toMap(todayRows);

    // 랜딩 출처별 카운트 (source 컬럼 기준)
    const sourceRows = await excludeAdmin(
      this.conversionRepo.createQueryBuilder('e')
        .select('COALESCE(e.source, \'direct\')', 'source')
        .addSelect('COUNT(*)', 'count')
        .where('e.event = :event', { event: 'page_view_landing' })
        .groupBy('e.source'),
    ).getRawMany<{ source: string; count: string }>();

    const landingSources = sourceRows.map((r) => ({ source: r.source, count: Number(r.count) }))
      .sort((a, b) => b.count - a.count);

    return {
      allTime: PAGE_EVENTS.map((e) => ({ event: e, count: all[e]   ?? 0 })),
      last7d:  PAGE_EVENTS.map((e) => ({ event: e, count: d7[e]    ?? 0 })),
      today:   PAGE_EVENTS.map((e) => ({ event: e, count: today[e] ?? 0 })),
      landingSources,
    };
  }

  async getConversionStats() {
    const EVENTS = ['premium_modal_open', 'premium_cta_click', 'checkout_page_view', 'upgrade_attempt', 'payment_success'];

    const adminIds = await this.getAdminUserIds();
    const excludeAdmin = (qb: ReturnType<typeof this.conversionRepo.createQueryBuilder>) =>
      adminIds.length > 0
        ? qb.andWhere('(e.userId IS NULL OR e.userId NOT IN (:...adminIds))', { adminIds })
        : qb;

    const [allTimeRows, last7dRows] = await Promise.all([
      excludeAdmin(this.conversionRepo.createQueryBuilder('e')
        .select('e.event', 'event')
        .addSelect('COUNT(*)', 'count')
        .groupBy('e.event'))
        .getRawMany<{ event: string; count: string }>(),
      excludeAdmin(this.conversionRepo.createQueryBuilder('e')
        .select('e.event', 'event')
        .addSelect('COUNT(*)', 'count')
        .where('e.createdAt >= :since', { since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) })
        .groupBy('e.event'))
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
