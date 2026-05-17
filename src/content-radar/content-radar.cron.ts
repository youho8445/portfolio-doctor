import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ContentRadarService } from './content-radar.service';

@Injectable()
export class ContentRadarCron {
  private readonly logger = new Logger(ContentRadarCron.name);

  constructor(private readonly contentRadarService: ContentRadarService) {}

  @Cron('0 21 * * *') // UTC 21:00 = KST 06:00 next day
  async runDailyRefresh(): Promise<void> {
    this.logger.log('Daily Content Radar cron triggered');
    await this.contentRadarService.refresh();
  }
}
