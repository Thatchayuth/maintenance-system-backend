import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../../entities/user.entity';

@Entity('push_subscriptions')
@Index(['userId', 'ipAddress'], { unique: false })
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'endpoint', type: 'nvarchar', length: 'max' })
  endpoint: string;

  @Column({ name: 'p256dh_key', type: 'nvarchar', length: 500 })
  p256dhKey: string;

  @Column({ name: 'auth_key', type: 'nvarchar', length: 500 })
  authKey: string;

  @Column({ name: 'ip_address', type: 'nvarchar', length: 45 })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'nvarchar', length: 500, nullable: true })
  userAgent: string;

  @Column({ name: 'device_name', type: 'nvarchar', length: 255, nullable: true })
  deviceName: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_used', type: 'datetime2', nullable: true })
  lastUsed: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
