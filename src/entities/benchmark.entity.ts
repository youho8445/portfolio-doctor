import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('benchmarks')
export class Benchmark {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 20 })
  code: string;

  @Column({ length: 100 })
  name: string;
}
