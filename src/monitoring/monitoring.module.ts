import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioStateEvent } from '../entities/portfolio-state-event.entity';
import { PortfolioSnapshot } from '../entities/portfolio-snapshot.entity';
import { Portfolio } from '../entities/portfolio.entity';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PortfolioStateEvent, PortfolioSnapshot, Portfolio]),
  ],
  controllers: [MonitoringController],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
