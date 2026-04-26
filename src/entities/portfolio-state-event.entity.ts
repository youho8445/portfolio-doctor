import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_state_events')
export class PortfolioStateEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  portfolioId: number;

  // SCORE_DROP | DIVERSIFICATION_DROP | OVERWEIGHT_ENTERED | SECTOR_BIAS_ENTERED
  // TOP3_CONCENTRATION_ENTERED | REBALANCE_NEEDED | OPPORTUNITY_AVAILABLE
  @Column({ length: 64 })
  eventType: string;

  @Column({ length: 120 })
  title: string;

  @Column('text')
  message: string;

  // info | warning | critical | opportunity
  @Column({ length: 20, default: 'warning' })
  severity: string;

  @Column('text', { nullable: true })
  metadataJson: string | null;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'datetime' })
  detectedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
