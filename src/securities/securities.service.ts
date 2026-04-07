import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Security } from '../entities/security.entity';
import { CreateSecurityDto } from './dto/create-security.dto';

@Injectable()
export class SecuritiesService {
  constructor(
    @InjectRepository(Security)
    private readonly securityRepository: Repository<Security>,
  ) {}

  async create(dto: CreateSecurityDto) {
    const security = this.securityRepository.create({
      ticker: dto.ticker.toUpperCase(),
      name: dto.name,
      sector: dto.sector ?? null,
      industry: dto.industry ?? null,
      country: dto.country ?? 'US',
      assetType: dto.assetType ?? 'STOCK',
    } as Security);
    return this.securityRepository.save(security);
  }

  async findAll() {
    return this.securityRepository.find({ order: { id: 'DESC' } });
  }

  async search(query?: string) {
    if (!query) {
      return this.findAll();
    }

    const q = query.trim();
    return this.securityRepository
      .createQueryBuilder('s')
      .where(
        's.ticker LIKE :ticker OR s.name LIKE :q OR s.displayNameKo LIKE :q OR s.searchText LIKE :q',
        { ticker: `%${q.toUpperCase()}%`, q: `%${q}%` },
      )
      .orderBy('s.ticker', 'ASC')
      .take(20)
      .getMany();
  }
}
