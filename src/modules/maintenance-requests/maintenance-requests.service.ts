import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
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
    // Use update() directly to ensure the value is saved
    await this.requestRepository.update(id, {
      assignedTo: assignDto.technicianId,
    });

    // Create log entry
    await this.logsService.create({
      requestId: id,
      actionBy: userId,
      message: `Technician assigned to the request`,
    });

    // Get updated request for WebSocket notification
    const updatedRequest = await this.findOne(id);

    // Notify via WebSocket
    this.maintenanceGateway.notifyRequestAssigned(updatedRequest);

    return updatedRequest;
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

  async getTvDashboardData(): Promise<{
    todayStats: {
      total: number;
      open: number;
      inProgress: number;
      completed: number;
      canceled: number;
    };
    pendingRequests: MaintenanceRequest[];
    inProgressRequests: MaintenanceRequest[];
    recentCompleted: MaintenanceRequest[];
    technicianWorkload: {
      technicianId: string;
      technicianName: string;
      inProgress: number;
      completed: number;
      open: number;
    }[];
    downtimeSummary: {
      totalDowntimeMinutes: number;
      averageResolutionMinutes: number;
      requestsWithDowntime: {
        id: string;
        title: string;
        machineName: string;
        startTime: Date;
        endTime: Date | null;
        downtimeMinutes: number;
      }[];
    };
    weeklyChart: {
      date: string;
      open: number;
      completed: number;
      canceled: number;
    }[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's stats
    const [todayTotal, todayOpen, todayInProgress, todayCompleted, todayCanceled] = await Promise.all([
      this.requestRepository.count({
        where: { createdAt: Between(today, tomorrow) },
      }),
      this.requestRepository.count({
        where: { createdAt: Between(today, tomorrow), status: Status.OPEN },
      }),
      this.requestRepository.count({
        where: { createdAt: Between(today, tomorrow), status: Status.IN_PROGRESS },
      }),
      this.requestRepository.count({
        where: { createdAt: Between(today, tomorrow), status: Status.COMPLETED },
      }),
      this.requestRepository.count({
        where: { createdAt: Between(today, tomorrow), status: Status.CANCELED },
      }),
    ]);

    // Pending requests (OPEN status)
    const pendingRequests = await this.requestRepository.find({
      where: { status: Status.OPEN },
      relations: ['machine', 'requestedByUser', 'assignedToUser'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // In Progress requests
    const inProgressRequests = await this.requestRepository.find({
      where: { status: Status.IN_PROGRESS },
      relations: ['machine', 'requestedByUser', 'assignedToUser'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // Recent completed (today)
    const recentCompleted = await this.requestRepository.find({
      where: { 
        status: Status.COMPLETED,
        updatedAt: MoreThanOrEqual(today),
      },
      relations: ['machine', 'requestedByUser', 'assignedToUser'],
      order: { updatedAt: 'DESC' },
      take: 10,
    });

    // Technician workload
    const technicianWorkloadRaw = await this.requestRepository
      .createQueryBuilder('request')
      .select('request.assigned_to', 'technicianId')
      .addSelect('assignedToUser.fullName', 'technicianName')
      .addSelect(`SUM(CASE WHEN request.status = 'IN_PROGRESS' THEN 1 ELSE 0 END)`, 'inProgress')
      .addSelect(`SUM(CASE WHEN request.status = 'COMPLETED' THEN 1 ELSE 0 END)`, 'completed')
      .addSelect(`SUM(CASE WHEN request.status = 'OPEN' THEN 1 ELSE 0 END)`, 'open')
      .leftJoin('request.assignedToUser', 'assignedToUser')
      .where('request.assigned_to IS NOT NULL')
      .groupBy('request.assigned_to')
      .addGroupBy('assignedToUser.fullName')
      .getRawMany();

    const technicianWorkload = technicianWorkloadRaw.map(t => ({
      technicianId: t.technicianId,
      technicianName: t.technicianName || 'Unknown',
      inProgress: parseInt(t.inProgress) || 0,
      completed: parseInt(t.completed) || 0,
      open: parseInt(t.open) || 0,
    }));

    // Downtime summary (completed requests with resolution time)
    const completedWithTime = await this.requestRepository.find({
      where: { status: Status.COMPLETED },
      relations: ['machine'],
      order: { updatedAt: 'DESC' },
      take: 20,
    });

    const requestsWithDowntime = completedWithTime.map(req => {
      const downtimeMinutes = Math.round(
        (new Date(req.updatedAt).getTime() - new Date(req.createdAt).getTime()) / (1000 * 60)
      );
      return {
        id: req.id,
        title: req.title,
        machineName: req.machine?.name || 'Unknown',
        startTime: req.createdAt,
        endTime: req.updatedAt,
        downtimeMinutes,
      };
    });

    const totalDowntimeMinutes = requestsWithDowntime.reduce((sum, r) => sum + r.downtimeMinutes, 0);
    const averageResolutionMinutes = requestsWithDowntime.length > 0 
      ? Math.round(totalDowntimeMinutes / requestsWithDowntime.length) 
      : 0;

    // Weekly chart data (last 7 days)
    const weeklyChart = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [open, completed, canceled] = await Promise.all([
        this.requestRepository.count({
          where: { createdAt: Between(date, nextDate), status: Status.OPEN },
        }),
        this.requestRepository.count({
          where: { updatedAt: Between(date, nextDate), status: Status.COMPLETED },
        }),
        this.requestRepository.count({
          where: { updatedAt: Between(date, nextDate), status: Status.CANCELED },
        }),
      ]);

      weeklyChart.push({
        date: date.toISOString().split('T')[0],
        open,
        completed,
        canceled,
      });
    }

    return {
      todayStats: {
        total: todayTotal,
        open: todayOpen,
        inProgress: todayInProgress,
        completed: todayCompleted,
        canceled: todayCanceled,
      },
      pendingRequests,
      inProgressRequests,
      recentCompleted,
      technicianWorkload,
      downtimeSummary: {
        totalDowntimeMinutes,
        averageResolutionMinutes,
        requestsWithDowntime: requestsWithDowntime.slice(0, 10),
      },
      weeklyChart,
    };
  }
}
