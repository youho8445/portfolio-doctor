import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  // PushSubscription.endpoint
  @Column('text')
  endpoint: string;

  // JSON: { p256dh, auth }
  @Column('text')
  keysJson: string;

  @CreateDateColumn()
  createdAt: Date;
}
