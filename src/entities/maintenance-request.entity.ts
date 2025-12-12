import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Priority } from '../common/enums/priority.enum';
import { Status } from '../common/enums/status.enum';
import { User } from './user.entity';
import { Machine } from './machine.entity';
import { MaintenanceLog } from './maintenance-log.entity';

@Entity('maintenance_requests')
export class MaintenanceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'machine_id' })
  machineId: string;

  @Column({ name: 'requested_by' })
  requestedBy: string;

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: string | null;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: Priority.MEDIUM,
  })
  priority: Priority;

  @Column({
    type: 'varchar',
    length: 20,
    default: Status.OPEN,
  })
  status: Status;

  @Column({ name: 'image_url', type: 'varchar', nullable: true, length: 500 })
  imageUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Machine, (machine) => machine.maintenanceRequests)
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @ManyToOne(() => User, (user) => user.requestedMaintenance)
  @JoinColumn({ name: 'requested_by' })
  requestedByUser: User;

  @ManyToOne(() => User, (user) => user.assignedMaintenance, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedToUser: User | null;

  @OneToMany(() => MaintenanceLog, (log) => log.request)
  logs: MaintenanceLog[];
}
