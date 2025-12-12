import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, Between } from 'typeorm';
import { MaintenanceRequest } from '../../entities/maintenance-request.entity';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateMaintenanceRequestDto } from './dto/update-maintenance-request.dto';
import { FilterMaintenanceRequestDto } from './dto/filter-maintenance-request.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { MaintenanceLogsService } from '../maintenance-logs/maintenance-logs.service';
import { MaintenanceGateway } from '../websocket/maintenance.gateway';
import { Status } from '../../common/enums/status.enum';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class MaintenanceRequestsService {
  constructor(
    @InjectRepository(MaintenanceRequest)
    private readonly requestRepository: Repository<MaintenanceRequest>,
    private readonly logsService: MaintenanceLogsService,
    private readonly maintenanceGateway: MaintenanceGateway,
  ) {}

  async create(
    createDto: CreateMaintenanceRequestDto,
    userId: string,
  ): Promise<MaintenanceRequest> {
    const request = this.requestRepository.create({
      ...createDto,
      requestedBy: userId,
      status: Status.OPEN,
    });

    const savedRequest = await this.requestRepository.save(request);

    // Create log entry
    await this.logsService.create({
      requestId: savedRequest.id,
      actionBy: userId,
      message: 'Maintenance request created',
    });

    // Notify via WebSocket
    this.maintenanceGateway.notifyRequestCreated(savedRequest);

    return this.findOne(savedRequest.id);
  }

  async findAll(filterDto: FilterMaintenanceRequestDto): Promise<{
    data: MaintenanceRequest[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { machineId, priority, status, startDate, endDate, page = 1, limit = 10 } = filterDto;

    const where: FindOptionsWhere<MaintenanceRequest> = {};

    if (machineId) {
      where.machineId = machineId;
    }

    if (priority) {
      where.priority = priority;
    }

    if (status) {
      where.status = status;
    }

    const queryBuilder = this.requestRepository.createQueryBuilder('request');

    queryBuilder
      .leftJoinAndSelect('request.machine', 'machine')
      .leftJoinAndSelect('request.requestedByUser', 'requestedByUser')
      .leftJoinAndSelect('request.assignedToUser', 'assignedToUser');

    if (machineId) {
      queryBuilder.andWhere('request.machineId = :machineId', { machineId });
    }

    if (priority) {
      queryBuilder.andWhere('request.priority = :priority', { priority });
    }

    if (status) {
      queryBuilder.andWhere('request.status = :status', { status });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('request.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .orderBy('request.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const data = await queryBuilder.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<MaintenanceRequest> {
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: ['machine', 'requestedByUser', 'assignedToUser', 'logs', 'logs.actionByUser'],
    });

    if (!request) {
      throw new NotFoundException(`Maintenance request with ID ${id} not found`);
    }

    return request;
  }

  async findByTechnician(technicianId: string): Promise<MaintenanceRequest[]> {
    return this.requestRepository.find({
      where: { assignedTo: technicianId },
      relations: ['machine', 'requestedByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: string): Promise<MaintenanceRequest[]> {
    return this.requestRepository.find({
      where: { requestedBy: userId },
      relations: ['machine', 'assignedToUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: string,
    updateDto: UpdateMaintenanceRequestDto,
    userId: string,
  ): Promise<MaintenanceRequest> {
    const request = await this.findOne(id);

    Object.assign(request, updateDto);
    const updatedRequest = await this.requestRepository.save(request);

    // Create log entry
    await this.logsService.create({
      requestId: id,
      actionBy: userId,
      message: 'Maintenance request updated',
    });

    return this.findOne(updatedRequest.id);
  }

  async assignTechnician(
    id: string,
    assignDto: AssignTechnicianDto,
    userId: string,
  ): Promise<MaintenanceRequest> {
    const request = await this.findOne(id);

    request.assignedTo = assignDto.technicianId;
    if (request.status === Status.OPEN) {
      request.status = Status.IN_PROGRESS;
    }

    const updatedRequest = await this.requestRepository.save(request);

    // Create log entry
    await this.logsService.create({
      requestId: id,
      actionBy: userId,
      message: `Technician assigned to the request`,
    });

    // Notify via WebSocket
    this.maintenanceGateway.notifyRequestAssigned(updatedRequest);

    return this.findOne(updatedRequest.id);
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateStatusDto,
    userId: string,
    userRole: Role,
  ): Promise<MaintenanceRequest> {
    const request = await this.findOne(id);

    // Check if user is allowed to update status
    if (userRole === Role.TECHNICIAN && request.assignedTo !== userId) {
      throw new ForbiddenException('You are not assigned to this request');
    }

    const oldStatus = request.status;
    request.status = updateStatusDto.status;

    const updatedRequest = await this.requestRepository.save(request);

    // Create log entry
    await this.logsService.create({
      requestId: id,
      actionBy: userId,
      message: updateStatusDto.message || `Status changed from ${oldStatus} to ${updateStatusDto.status}`,
    });

    // Notify via WebSocket
    this.maintenanceGateway.notifyStatusChanged(updatedRequest, oldStatus);

    return this.findOne(updatedRequest.id);
  }

  async remove(id: string): Promise<void> {
    const request = await this.findOne(id);
    await this.requestRepository.remove(request);
  }

  async getStats(): Promise<{
    total: number;
    open: number;
    inProgress: number;
    completed: number;
    canceled: number;
  }> {
    const [total, open, inProgress, completed, canceled] = await Promise.all([
      this.requestRepository.count(),
      this.requestRepository.count({ where: { status: Status.OPEN } }),
      this.requestRepository.count({ where: { status: Status.IN_PROGRESS } }),
      this.requestRepository.count({ where: { status: Status.COMPLETED } }),
      this.requestRepository.count({ where: { status: Status.CANCELED } }),
    ]);

    return { total, open, inProgress, completed, canceled };
  }
}
