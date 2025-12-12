import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MachinesModule } from './modules/machines/machines.module';
import { MaintenanceRequestsModule } from './modules/maintenance-requests/maintenance-requests.module';
import { MaintenanceLogsModule } from './modules/maintenance-logs/maintenance-logs.module';
import { UploadModule } from './modules/upload/upload.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { SettingsModule } from './modules/settings/settings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

// Entities
import { User } from './entities/user.entity';
import { Machine } from './entities/machine.entity';
import { MaintenanceRequest } from './entities/maintenance-request.entity';
import { MaintenanceLog } from './entities/maintenance-log.entity';
import { Setting } from './modules/settings/entities/setting.entity';
import { PushSubscription } from './modules/notifications/entities/push-subscription.entity';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mssql',
        host: configService.get('DB_HOST'),
        port: parseInt(configService.get('DB_PORT') || '1433'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [User, Machine, MaintenanceRequest, MaintenanceLog, Setting, PushSubscription],
        synchronize: configService.get('APP_ENV') === 'development',
        options: {
          encrypt: false,
          trustServerCertificate: true,
        },
        logging: configService.get('APP_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Static file serving for uploads
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    MachinesModule,
    MaintenanceRequestsModule,
    MaintenanceLogsModule,
    UploadModule,
    WebsocketModule,
    SettingsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
