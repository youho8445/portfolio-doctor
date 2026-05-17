import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppSetting } from '../entities/app-setting.entity';
import { Security } from '../entities/security.entity';
import { Benchmark } from '../entities/benchmark.entity';
import { User } from '../entities/user.entity';
import { ConversionEvent } from '../entities/conversion-event.entity';
import { Feedback } from '../entities/feedback.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PriceFetchService } from './price-fetch.service';
import { FeedbackModule } from '../feedback/feedback.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppSetting, Security, Benchmark, User, ConversionEvent, Feedback]),
    FeedbackModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, PriceFetchService],
  exports: [AdminService],
})
export class AdminModule {}
