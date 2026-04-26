import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('phone_verifications')
@Index(['phoneNumber', 'createdAt'])
export class PhoneVerification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30 })
  phoneNumber: string;

  @Column({ length: 200 })
  codeHash: string;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'datetime', nullable: true, default: null })
  verifiedAt: Date | null;

  @Column({ default: 0 })
  attempts: number;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
