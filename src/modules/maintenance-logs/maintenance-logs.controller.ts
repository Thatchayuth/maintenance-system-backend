import { Controller, Get, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MaintenanceLogsService } from './maintenance-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Maintenance Logs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('api/maintenance-logs')
export class MaintenanceLogsController {
  constructor(private readonly logsService: MaintenanceLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all maintenance logs (latest 100)' })
  @ApiResponse({ status: 200, description: 'List of maintenance logs' })
  findAll() {
    return this.logsService.findAll();
  }

  @Get('request/:requestId')
  @ApiOperation({ summary: 'Get logs for a specific maintenance request' })
  @ApiResponse({ status: 200, description: 'List of logs for the request' })
  findByRequest(@Param('requestId', ParseUUIDPipe) requestId: string) {
    return this.logsService.findByRequest(requestId);
  }
}
