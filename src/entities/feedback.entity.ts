import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true, default: null })
  userId: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true, default: null })
  sessionId: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, default: null })
  analysisId: string | null;

  @Column({ type: 'varchar', length: 32 })
  page: string;

  @Column({ type: 'varchar', length: 16 })
  rating: string;

  @Column({ type: 'simple-json', nullable: true, default: null })
  reasons: string[] | null;

  @Column({ type: 'varchar', length: 1000, nullable: true, default: null })
  message: string | null;

  @Column({ default: false })
  isGuest: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, default: null })
  healthScore: number | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
