import { CreateDateColumn, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('premium_unlocks')
export class PremiumUnlock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  portfolioId: number;

  @Column({ unique: true })
  stripeSessionId: string;

  @CreateDateColumn()
  createdAt: Date;
}
