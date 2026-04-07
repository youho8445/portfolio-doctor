import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Portfolio } from './portfolio.entity';
import { Security } from './security.entity';

@Entity('portfolio_items')
export class PortfolioItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  portfolioId: number;

  @Column()
  securityId: number;

  @Column('decimal', { precision: 7, scale: 2, default: 0 })
  weight: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  amount: number | null;

  @Column('decimal', { precision: 15, scale: 4, nullable: true })
  avgCost: number | null;

  @ManyToOne(() => Portfolio, (portfolio) => portfolio.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'portfolioId' })
  portfolio: Portfolio;

  @ManyToOne(() => Security, {
    eager: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'securityId' })
  security: Security;
}
