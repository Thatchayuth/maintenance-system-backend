import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MachinesService } from './machines.service';
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Machines')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('api/machines')
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new machine (Admin only)' })
  @ApiResponse({ status: 201, description: 'Machine created successfully' })
  @ApiResponse({ status: 409, description: 'Machine code already exists' })
  create(@Body() createMachineDto: CreateMachineDto) {
    return this.machinesService.create(createMachineDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all machines' })
  @ApiResponse({ status: 200, description: 'List of all machines' })
  findAll() {
    return this.machinesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a machine by ID' })
  @ApiResponse({ status: 200, description: 'Machine found' })
  @ApiResponse({ status: 404, description: 'Machine not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.machinesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a machine (Admin only)' })
  @ApiResponse({ status: 200, description: 'Machine updated successfully' })
  @ApiResponse({ status: 404, description: 'Machine not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMachineDto: UpdateMachineDto,
  ) {
    return this.machinesService.update(id, updateMachineDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a machine (Admin only)' })
  @ApiResponse({ status: 200, description: 'Machine deleted successfully' })
  @ApiResponse({ status: 404, description: 'Machine not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.machinesService.remove(id);
  }
}
