import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('daily_content_news')
export class DailyContentNews {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'varchar', length: 100 })
  source: string;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'datetime', nullable: true, default: null })
  publishedAt: Date | null;

  @Column({ type: 'varchar', length: 20 })
  market: string;

  @Column({ type: 'varchar', length: 30 })
  category: string;

  @Column({ type: 'simple-json', nullable: true, default: null })
  relatedTickers: string[] | null;

  @Column({ type: 'varchar', length: 500 })
  summary: string;

  @Column({ type: 'varchar', length: 500 })
  pobalanceAngle: string;

  @Column({ type: 'varchar', length: 300 })
  contentHook: string;

  @Column({ type: 'varchar', length: 600 })
  captionDraft: string;

  @Column({ type: 'simple-json', nullable: true, default: null })
  glossaryTerms: string[] | null;

  @Column({ type: 'simple-json', nullable: true, default: null })
  hashtags: string[] | null;

  @Column({ type: 'varchar', length: 30 })
  contentType: string;

  @Column({ type: 'int', default: 50 })
  contentScore: number;

  @Column({ type: 'varchar', length: 10, default: 'new' })
  status: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
