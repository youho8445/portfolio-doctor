import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyContentNews } from '../entities/daily-content-news.entity';
import { ContentRadarService } from './content-radar.service';
import { ContentRadarController } from './content-radar.controller';
import { ContentRadarCron } from './content-radar.cron';

@Module({
  imports: [TypeOrmModule.forFeature([DailyContentNews])],
  controllers: [ContentRadarController],
  providers: [ContentRadarService, ContentRadarCron],
})
export class ContentRadarModule {}
