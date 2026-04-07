import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Portfolio } from '../entities/portfolio.entity';
import { PortfolioItem } from '../entities/portfolio-item.entity';
import { Security } from '../entities/security.entity';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { AddPortfolioItemDto } from './dto/add-portfolio-item.dto';

@Injectable()
export class PortfoliosService {
  constructor(
    @InjectRepository(Portfolio)
    private readonly portfolioRepository: Repository<Portfolio>,
    @InjectRepository(PortfolioItem)
    private readonly portfolioItemRepository: Repository<PortfolioItem>,
    @InjectRepository(Security)
    private readonly securityRepository: Repository<Security>,
  ) {}

  async create(dto: CreatePortfolioDto) {
    const portfolio = this.portfolioRepository.create({ name: dto.name });
    return this.portfolioRepository.save(portfolio);
  }

  async findAll() {
    return this.portfolioRepository.find({ order: { id: 'DESC' } });
  }

  async findOne(id: number) {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    return portfolio;
  }

  async addItem(portfolioId: number, dto: AddPortfolioItemDto) {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId },
    });
    if (!portfolio) throw new NotFoundException('Portfolio not found');

    const security = await this.securityRepository.findOne({
      where: { id: dto.securityId },
    });
    if (!security) throw new NotFoundException('Security not found');

    const existing = await this.portfolioItemRepository.findOne({
      where: { portfolioId, securityId: dto.securityId },
    });

    if (existing) {
      if (dto.amount !== undefined) existing.amount = dto.amount;
      if (dto.weight !== undefined) existing.weight = dto.weight;
      if (dto.avgCost !== undefined) existing.avgCost = dto.avgCost;
      await this.portfolioItemRepository.save(existing);
    } else {
      const item = this.portfolioItemRepository.create({
        portfolioId,
        securityId: dto.securityId,
        weight: dto.weight ?? 0,
        amount: dto.amount ?? null,
        avgCost: dto.avgCost ?? null,
      });
      await this.portfolioItemRepository.save(item);
    }

    // amount 기반이면 포트폴리오 전체 비중을 재계산
    if (dto.amount !== undefined) {
      await this.recalculateWeightsFromAmounts(portfolioId);
    }

    return this.portfolioItemRepository.findOne({
      where: { portfolioId, securityId: dto.securityId },
    });
  }

  private async recalculateWeightsFromAmounts(portfolioId: number): Promise<void> {
    const items = await this.portfolioItemRepository.find({ where: { portfolioId } });
    const total = items.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
    if (total === 0) return;

    for (const item of items) {
      item.weight = Number(((Number(item.amount ?? 0) / total) * 100).toFixed(2));
    }
    await this.portfolioItemRepository.save(items);
  }

  async delete(id: number) {
    const portfolio = await this.portfolioRepository.findOne({ where: { id } });
    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }
    await this.portfolioItemRepository.delete({ portfolioId: id });
    await this.portfolioRepository.delete(id);
    return { success: true };
  }

  async findItems(portfolioId: number) {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId },
    });
    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    return this.portfolioItemRepository.find({
      where: { portfolioId },
      order: { id: 'ASC' },
    });
  }
}
