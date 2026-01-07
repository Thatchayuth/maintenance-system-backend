import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { MaintenanceRequest } from '../../entities/maintenance-request.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto, ChangePasswordDto } from './dto/update-profile.dto';
import { Role } from '../../common/enums/role.enum';
import { Status } from '../../common/enums/status.enum';

export interface TechnicianWithWorkload extends User {
  inProgressCount: number;
  openCount: number;
  totalAssigned: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MaintenanceRequest)
    private readonly requestRepository: Repository<MaintenanceRequest>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { username: createUserDto.username },
    });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username },
    });
  }

  async findTechnicians(): Promise<User[]> {
    return this.userRepository.find({
      where: { role: Role.TECHNICIAN },
      order: { fullName: 'ASC' },
    });
  }

  async findTechniciansWithWorkload(): Promise<TechnicianWithWorkload[]> {
    const technicians = await this.userRepository.find({
      where: { role: Role.TECHNICIAN },
      order: { fullName: 'ASC' },
    });

    const techniciansWithWorkload = await Promise.all(
      technicians.map(async (tech) => {
        const [inProgressCount, openCount, totalAssigned] = await Promise.all([
          this.requestRepository.count({
            where: { assignedTo: tech.id, status: Status.IN_PROGRESS },
          }),
          this.requestRepository.count({
            where: { assignedTo: tech.id, status: Status.OPEN },
          }),
          this.requestRepository.count({
            where: { assignedTo: tech.id },
          }),
        ]);

        return {
          ...tech,
          inProgressCount,
          openCount,
          totalAssigned,
        } as TechnicianWithWorkload;
      }),
    );

    // Sort by in-progress count (ascending) - recommend technician with least workload
    return techniciansWithWorkload.sort((a, b) => {
      const aWorkload = a.inProgressCount + a.openCount;
      const bWorkload = b.inProgressCount + b.openCount;
      return aWorkload - bWorkload;
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: updateUserDto.username },
      });

      if (existingUser) {
        throw new ConflictException('Username already exists');
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  // Profile methods for current user
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findOne(userId);

    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
      }
    }

    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('รหัสผ่านปัจจุบันไม่ถูกต้อง');
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.update(userId, { password: hashedPassword });

    return { message: 'เปลี่ยนรหัสผ่านสำเร็จ' };
  }

  async getProfileById(userId: string): Promise<Partial<User>> {
    const user = await this.findOne(userId);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
