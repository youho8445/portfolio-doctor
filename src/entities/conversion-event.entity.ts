import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('conversion_events')
export class ConversionEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  event: string;

  @Column({ type: 'int', nullable: true, default: null })
  userId: number | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
