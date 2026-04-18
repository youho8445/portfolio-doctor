import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { PortfoliosModule } from './portfolios/portfolios.module';
import { SecuritiesModule } from './securities/securities.module';
import { PricesModule } from './prices/prices.module';
import { AnalysisModule } from './analysis/analysis.module';
import { HistoryModule } from './history/history.module';
import { PaymentsModule } from './payments/payments.module';

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
    AuthModule,
    PortfoliosModule,
    SecuritiesModule,
    PricesModule,
    AnalysisModule,
    HistoryModule,
    PaymentsModule,
  ],
})
export class AppModule {}
