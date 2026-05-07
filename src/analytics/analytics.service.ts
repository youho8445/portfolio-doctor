import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversionEvent } from '../entities/conversion-event.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ConversionEvent)
    private readonly repo: Repository<ConversionEvent>,
  ) {}

  async track(event: string, userId: number | null): Promise<void> {
    await this.repo.save(this.repo.create({ event, userId }));
  }
}
