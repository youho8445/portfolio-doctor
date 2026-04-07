import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('securities')
export class Security {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 20 })
  ticker: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 100, nullable: true })
  sector: string;

  @Column({ length: 100, nullable: true })
  industry: string;

  @Column({ length: 20, default: 'US' })
  country: string;

  @Column({ length: 20, default: 'STOCK' })
  assetType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  displayNameKo: string | null;

  @Column({ type: 'text', nullable: true })
  searchText: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
