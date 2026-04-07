import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('benchmark_price_daily')
@Index(['benchmarkId', 'tradeDate'], { unique: true })
export class BenchmarkPriceDaily {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  benchmarkId: number;

  @Column({ type: 'date' })
  tradeDate: string;

  @Column('decimal', { precision: 15, scale: 4 })
  close: number;
}
