import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Security } from '../entities/security.entity';
import { SecuritiesController } from './securities.controller';
import { SecuritiesService } from './securities.service';

@Module({
  imports: [TypeOrmModule.forFeature([Security])],
  controllers: [SecuritiesController],
  providers: [SecuritiesService],
  exports: [SecuritiesService],
})
export class SecuritiesModule {}
