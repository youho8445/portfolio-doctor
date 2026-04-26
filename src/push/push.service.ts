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
    const existing = await this.subRepo.findOne({ where: { userId, endpoint } });
    if (existing) return;

    const sub = this.subRepo.create({
      userId,
      endpoint,
      keysJson: JSON.stringify(keys),
    });
    await this.subRepo.save(sub);
  }

  async unsubscribe(userId: number, endpoint: string): Promise<void> {
    await this.subRepo.delete({ userId, endpoint });
  }

  async sendToUser(userId: number, title: string, body: string, data?: Record<string, unknown>): Promise<void> {
    if (!this.vapidConfigured) return;

    const subs = await this.subRepo.find({ where: { userId } });
    const payload = JSON.stringify({ title, body, data: data ?? {} });

    const removes: number[] = [];
    await Promise.all(
      subs.map(async (sub) => {
        try {
          const keys = JSON.parse(sub.keysJson) as { p256dh: string; auth: string };
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys },
            payload,
          );
        } catch (err: any) {
          // 410 Gone = subscription expired/unregistered
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            removes.push(sub.id);
          } else {
            this.logger.warn(`Push failed for sub ${sub.id}: ${err?.message}`);
          }
        }
      }),
    );

    if (removes.length) {
      await this.subRepo.delete(removes);
    }
  }
}
