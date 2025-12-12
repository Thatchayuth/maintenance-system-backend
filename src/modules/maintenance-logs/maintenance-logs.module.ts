import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceLogsService } from './maintenance-logs.service';
import { MaintenanceLogsController } from './maintenance-logs.controller';
import { MaintenanceLog } from '../../entities/maintenance-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MaintenanceLog])],
  controllers: [MaintenanceLogsController],
  providers: [MaintenanceLogsService],
  exports: [MaintenanceLogsService],
})
export class MaintenanceLogsModule {}
