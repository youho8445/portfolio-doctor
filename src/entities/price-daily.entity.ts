import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('price_daily')
@Index(['securityId', 'tradeDate'], { unique: true })
export class PriceDaily {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  securityId: number;

  @Column({ type: 'date' })
  tradeDate: string;

  @Column('decimal', { precision: 15, scale: 4 })
  close: number;

  @Column('bigint', { nullable: true })
  volume: number | null;
}
