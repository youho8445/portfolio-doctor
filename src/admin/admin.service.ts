import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from '../entities/app-setting.entity';

export type BillingMode = 'FREE' | 'SOFT_PAYWALL' | 'PAID';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AppSetting)
    private readonly settingRepo: Repository<AppSetting>,
  ) {}

  async getBillingMode(): Promise<BillingMode> {
    const setting = await this.settingRepo.findOne({ where: { key: 'billing_mode' } });
    return (setting?.value as BillingMode) ?? 'FREE';
  }

  async setBillingMode(mode: BillingMode): Promise<void> {
    await this.settingRepo.upsert({ key: 'billing_mode', value: mode }, ['key']);
  }
}
