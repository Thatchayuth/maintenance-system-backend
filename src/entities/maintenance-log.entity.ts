import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MaintenanceRequest } from './maintenance-request.entity';
import { User } from './user.entity';

@Entity('maintenance_logs')
export class MaintenanceLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id' })
  requestId: string;

  @Column({ name: 'action_by' })
  actionBy: string;

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => MaintenanceRequest, (request) => request.logs)
  @JoinColumn({ name: 'request_id' })
  request: MaintenanceRequest;

  @ManyToOne(() => User, (user) => user.maintenanceLogs)
  @JoinColumn({ name: 'action_by' })
  actionByUser: User;
}
