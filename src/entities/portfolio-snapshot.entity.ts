import { CreateDateColumn, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_snapshots')
export class PortfolioSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  portfolioId: number;

  @Column()
  userId: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  healthScore: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  diversificationScore: number;

  @Column('decimal', { precision: 7, scale: 2, default: 0 })
  portfolioReturn: number;

  @Column('decimal', { precision: 7, scale: 2, default: 0 })
  benchmarkReturn: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  top3Concentration: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  maxSectorWeight: number;

  @Column({ default: '' })
  maxSectorName: string;

  @Column({ default: '-' })
  portfolioStyle: string;

  @Column('text', { nullable: true })
  sectorExposureJson: string;

  @Column('text', { nullable: true })
  warningsJson: string;

  @Column('text', { nullable: true })
  itemsJson: string;

  @CreateDateColumn()
  createdAt: Date;
}
