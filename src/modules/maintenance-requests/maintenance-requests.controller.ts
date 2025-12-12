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
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MaintenanceRequestsService } from './maintenance-requests.service';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateMaintenanceRequestDto } from './dto/update-maintenance-request.dto';
import { FilterMaintenanceRequestDto } from './dto/filter-maintenance-request.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Maintenance Requests')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('api/maintenance-requests')
export class MaintenanceRequestsController {
  constructor(private readonly requestsService: MaintenanceRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new maintenance request' })
  @ApiResponse({ status: 201, description: 'Request created successfully' })
  create(
    @Body() createDto: CreateMaintenanceRequestDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.requestsService.create(createDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all maintenance requests with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'List of maintenance requests' })
  findAll(@Query() filterDto: FilterMaintenanceRequestDto) {
    return this.requestsService.findAll(filterDto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get maintenance request statistics' })
  @ApiResponse({ status: 200, description: 'Request statistics' })
  getStats() {
    return this.requestsService.getStats();
  }

  @Get('my-requests')
  @ApiOperation({ summary: 'Get current user requests' })
  @ApiResponse({ status: 200, description: 'List of user requests' })
  findMyRequests(@CurrentUser('sub') userId: string) {
    return this.requestsService.findByUser(userId);
  }

  @Get('my-assignments')
  @UseGuards(RolesGuard)
  @Roles(Role.TECHNICIAN, Role.ADMIN)
  @ApiOperation({ summary: 'Get requests assigned to current technician' })
  @ApiResponse({ status: 200, description: 'List of assigned requests' })
  findMyAssignments(@CurrentUser('sub') userId: string) {
    return this.requestsService.findByTechnician(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a maintenance request by ID' })
  @ApiResponse({ status: 200, description: 'Request found' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.requestsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a maintenance request' })
  @ApiResponse({ status: 200, description: 'Request updated successfully' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateMaintenanceRequestDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.requestsService.update(id, updateDto, userId);
  }

  @Patch(':id/assign')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Assign a technician to a request (Admin only)' })
  @ApiResponse({ status: 200, description: 'Technician assigned successfully' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  assignTechnician(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignDto: AssignTechnicianDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.requestsService.assignTechnician(id, assignDto, userId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  @ApiOperation({ summary: 'Update request status (Admin/Technician)' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.requestsService.updateStatus(id, updateStatusDto, userId, userRole);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a maintenance request (Admin only)' })
  @ApiResponse({ status: 200, description: 'Request deleted successfully' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.requestsService.remove(id);
  }
}
