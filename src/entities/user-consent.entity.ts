import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user_consents')
export class UserConsent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 20 })
  termsVersion: string;

  @Column({ length: 20 })
  privacyVersion: string;

  @Column({ length: 20 })
  riskDisclaimerVersion: string;

  @Column({ default: false })
  marketingConsent: boolean;

  @Column({ type: 'datetime' })
  agreedToTermsAt: Date;

  @Column({ type: 'datetime' })
  agreedToPrivacyAt: Date;

  @Column({ type: 'datetime' })
  agreedToRiskDisclaimerAt: Date;

  @Column({ type: 'datetime', nullable: true })
  agreedToMarketingAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
