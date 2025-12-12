import { Module, forwardRef } from '@nestjs/common';
import { MaintenanceGateway } from './maintenance.gateway';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  providers: [MaintenanceGateway],
  exports: [MaintenanceGateway],
})
export class WebsocketModule {}
