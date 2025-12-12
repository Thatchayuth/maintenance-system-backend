import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceLog } from '../../entities/maintenance-log.entity';
import { CreateMaintenanceLogDto } from './dto/create-maintenance-log.dto';

@Injectable()
export class MaintenanceLogsService {
  constructor(
    @InjectRepository(MaintenanceLog)
    private readonly logRepository: Repository<MaintenanceLog>,
  ) {}

  async create(createDto: CreateMaintenanceLogDto): Promise<MaintenanceLog> {
    const log = this.logRepository.create(createDto);
    return this.logRepository.save(log);
  }

  async findByRequest(requestId: string): Promise<MaintenanceLog[]> {
    return this.logRepository.find({
      where: { requestId },
      relations: ['actionByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(): Promise<MaintenanceLog[]> {
    return this.logRepository.find({
      relations: ['actionByUser', 'request', 'request.machine'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
