import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true, length: 200, nullable: true, default: null })
  email: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  name: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, default: null, name: 'password' })
  passwordHash: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, default: null })
  googleId: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, default: null })
  appleId: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true, default: null, unique: true })
  phoneNumber: string | null;

  @Column({ default: false })
  phoneVerified: boolean;

  @Column({ type: 'datetime', nullable: true, default: null })
  trialEndsAt: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
