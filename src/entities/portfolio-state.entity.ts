import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type PortfolioStateValue =
  | 'stable'
  | 'concentrated'
  | 'risky'
  | 'improving'
  | 'deteriorating';

@Entity('portfolio_states')
@Index(['portfolioId', 'changedAt'])
export class PortfolioState {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  portfolioId: number;

  @Column()
  userId: number;

  @Column({ length: 20 })
  state: PortfolioStateValue;

  @Column('decimal', { precision: 5, scale: 2 })
  healthScore: number;

  @Column('decimal', { precision: 5, scale: 2 })
  diversScore: number;

  @Column('decimal', { precision: 5, scale: 2 })
  top3Concentration: number;

  @Column('decimal', { precision: 5, scale: 2 })
  maxSectorWeight: number;

  @Column({ length: 64, default: '' })
  maxSectorName: string;

  @Column({ length: 120 })
  reason: string;

  @Column({ type: 'datetime' })
  changedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
