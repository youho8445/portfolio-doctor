import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { PortfoliosModule } from './portfolios/portfolios.module';
import { SecuritiesModule } from './securities/securities.module';
import { PricesModule } from './prices/prices.module';
import { AnalysisModule } from './analysis/analysis.module';
import { HistoryModule } from './history/history.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { PushModule } from './push/push.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MarketModule } from './market/market.module';
import { FeedbackModule } from './feedback/feedback.module';
import { ContentRadarModule } from './content-radar/content-radar.module';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mariadb',
        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<string>('DB_PORT')),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
    ScheduleModule.forRoot(),
    AuthModule,
    PortfoliosModule,
    SecuritiesModule,
    PricesModule,
    AnalysisModule,
    HistoryModule,
    PaymentsModule,
    AdminModule,
    MonitoringModule,
    PushModule,
    AnalyticsModule,
    MarketModule,
    FeedbackModule,
    ContentRadarModule,
  ],
})
export class AppModule {}
