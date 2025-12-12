import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { MaintenanceRequest } from './maintenance-request.entity';
import { MaintenanceLog } from './maintenance-log.entity';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: Role.USER,
  })
  role: Role;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'refresh_token', nullable: true, type: 'varchar', length: 500 })
  @Exclude()
  refreshToken: string | null;

  @Column({ name: 'reset_password_token', nullable: true, type: 'varchar', length: 500 })
  @Exclude()
  resetPasswordToken: string | null;

  @Column({ name: 'reset_password_expires', nullable: true, type: 'datetime2' })
  @Exclude()
  resetPasswordExpires: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => MaintenanceRequest, (request) => request.requestedByUser)
  requestedMaintenance: MaintenanceRequest[];

  @OneToMany(() => MaintenanceRequest, (request) => request.assignedToUser)
  assignedMaintenance: MaintenanceRequest[];

  @OneToMany(() => MaintenanceLog, (log) => log.actionByUser)
  maintenanceLogs: MaintenanceLog[];
}
