import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AppSetting } from '../entities/app-setting.entity';
import { User } from '../entities/user.entity';

export type BillingMode = 'FREE' | 'SOFT_PAYWALL' | 'PAID';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AppSetting)
    private readonly settingRepo: Repository<AppSetting>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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
}
