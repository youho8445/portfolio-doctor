import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 200 })
  email: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 200 })
  password: string;

  @CreateDateColumn()
  createdAt: Date;
}
