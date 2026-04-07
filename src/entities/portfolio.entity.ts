import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PortfolioItem } from './portfolio-item.entity';

@Entity('portfolios')
export class Portfolio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => PortfolioItem, (item) => item.portfolio, {
    cascade: true,
  })
  items: PortfolioItem[];
}
