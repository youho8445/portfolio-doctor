import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversionEvent } from '../entities/conversion-event.entity';
import { User } from '../entities/user.entity';
import { isAdminEmail } from '../admin/admin-email.helper';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ConversionEvent)
    private readonly repo: Repository<ConversionEvent>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async track(event: string, userId: number | null, source?: string | null): Promise<void> {
    if (userId != null) {
      const user = await this.userRepo.findOne({ where: { id: userId }, select: ['email'] });
      if (user && isAdminEmail(user.email)) return;
    }
    await this.repo.save(this.repo.create({ event, userId, source: source ?? null }));
  }
}
