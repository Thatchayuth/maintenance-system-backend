import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Machine } from '../../entities/machine.entity';
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';

@Injectable()
export class MachinesService {
  constructor(
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
  ) {}

  async create(createMachineDto: CreateMachineDto): Promise<Machine> {
    const existingMachine = await this.machineRepository.findOne({
      where: { code: createMachineDto.code },
    });

    if (existingMachine) {
      throw new ConflictException('Machine code already exists');
    }

    const machine = this.machineRepository.create(createMachineDto);
    return this.machineRepository.save(machine);
  }

  async findAll(): Promise<Machine[]> {
    return this.machineRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Machine> {
    const machine = await this.machineRepository.findOne({
      where: { id },
      relations: ['maintenanceRequests'],
    });

    if (!machine) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }

    return machine;
  }

  async findByCode(code: string): Promise<Machine | null> {
    return this.machineRepository.findOne({
      where: { code },
    });
  }

  async update(id: string, updateMachineDto: UpdateMachineDto): Promise<Machine> {
    const machine = await this.findOne(id);

    if (updateMachineDto.code && updateMachineDto.code !== machine.code) {
      const existingMachine = await this.machineRepository.findOne({
        where: { code: updateMachineDto.code },
      });

      if (existingMachine) {
        throw new ConflictException('Machine code already exists');
      }
    }

    Object.assign(machine, updateMachineDto);
    return this.machineRepository.save(machine);
  }

  async remove(id: string): Promise<void> {
    const machine = await this.findOne(id);
    await this.machineRepository.remove(machine);
  }
}
