import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from '../entities/push-subscription.entity';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private vapidConfigured = false;

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subRepo: Repository<PushSubscription>,
  ) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const email = process.env.VAPID_EMAIL ?? 'mailto:admin@portfolio-doctor.app';

    if (publicKey && privateKey) {
      webpush.setVapidDetails(email, publicKey, privateKey);
      this.vapidConfigured = true;
    } else {
      this.logger.warn('VAPID keys not configured — web push disabled');
    }
  }

  getVapidPublicKey(): string {
    return process.env.VAPID_PUBLIC_KEY ?? '';
  }

  async subscribe(userId: number, endpoint: string, keys: { p256dh: string; auth: string }): Promise<void> {
    // Replace all existing subscriptions — keeps only the most recent domain/device
    await this.subRepo.delete({ userId });
    const sub = this.subRepo.create({ userId, endpoint, keysJson: JSON.stringify(keys) });
    await this.subRepo.save(sub);
  }

  async unsubscribe(userId: number, endpoint: string): Promise<void> {
    await this.subRepo.delete({ userId, endpoint });
  }

  async sendToUser(userId: number, title: string, body: string, data?: Record<string, unknown>): Promise<{ sent: number; failed: number }> {
    if (!this.vapidConfigured) {
      this.logger.warn('sendToUser skipped — VAPID not configured');
      return { sent: 0, failed: 0 };
    }

    const subs = await this.subRepo.find({ where: { userId } });
    if (!subs.length) {
      this.logger.warn(`sendToUser: no subscriptions for userId ${userId}`);
      return { sent: 0, failed: 0 };
    }

    const payload = JSON.stringify({ title, body, data: data ?? {} });
    const removes: number[] = [];
    let sent = 0;
    let failed = 0;

    await Promise.all(
      subs.map(async (sub) => {
        try {
          const keys = JSON.parse(sub.keysJson) as { p256dh: string; auth: string };
          await webpush.sendNotification({ endpoint: sub.endpoint, keys }, payload);
          sent++;
        } catch (err: any) {
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            removes.push(sub.id);
          } else {
            this.logger.warn(`Push failed for sub ${sub.id}: ${err?.statusCode} ${err?.message}`);
          }
          failed++;
        }
      }),
    );

    if (removes.length) await this.subRepo.delete(removes);
    this.logger.log(`Push to userId ${userId}: sent=${sent} failed=${failed}`);
    return { sent, failed };
  }
}
