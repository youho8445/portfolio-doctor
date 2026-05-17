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

  // ── Source data (RSS, no full body) ──────────────────────────────────
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

  // ── News content fields ───────────────────────────────────────────────
  @Column({ type: 'varchar', length: 500 })
  shortNewsSummary: string;

  @Column({ type: 'varchar', length: 500 })
  whyItMattersToPortfolio: string;

  @Column({ type: 'varchar', length: 300, nullable: true, default: null })
  beginnerCaution: string | null;

  // ── Script fields ─────────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 300 })
  openingHook: string;

  @Column({ type: 'varchar', length: 500, nullable: true, default: null })
  script15s: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true, default: null })
  script30s: string | null;

  @Column({ type: 'simple-json', nullable: true, default: null })
  subtitleLines: string[] | null;

  // ── Caption + metadata ────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 800 })
  captionDraft: string;

  @Column({ type: 'simple-json', nullable: true, default: null })
  hashtags: string[] | null;

  @Column({ type: 'simple-json', nullable: true, default: null })
  relatedGlossaryTerms: string[] | null;

  @Column({ type: 'varchar', length: 200, nullable: true, default: null })
  ctaText: string | null;

  // ── Classification + scoring ──────────────────────────────────────────
  @Column({ type: 'varchar', length: 30 })
  contentType: string;

  @Column({ type: 'int', default: 0 })
  contentScore: number;

  @Column({ type: 'int', default: 0 })
  scoreTrend: number;

  @Column({ type: 'int', default: 0 })
  scoreRelevance: number;

  @Column({ type: 'int', default: 0 })
  scoreBeginner: number;

  @Column({ type: 'int', default: 0 })
  scoreSource: number;

  @Column({ type: 'int', default: 0 })
  scorePenalty: number;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  selectionReason: string | null;

  @Column({ type: 'varchar', length: 10, default: 'new' })
  status: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
