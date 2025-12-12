import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { MaintenanceRequest } from '../../entities/maintenance-request.entity';
import { Status } from '../../common/enums/status.enum';
import { NotificationsService } from '../notifications/notifications.service';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:4200', 'http://localhost:3000'],
    credentials: true,
  },
  namespace: '/maintenance',
})
export class MaintenanceGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MaintenanceGateway.name);

  constructor(
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
  ) {
    client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);
    return { event: 'joinedRoom', data: room };
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
  ) {
    client.leave(room);
    this.logger.log(`Client ${client.id} left room: ${room}`);
    return { event: 'leftRoom', data: room };
  }

  async notifyRequestCreated(request: MaintenanceRequest) {
    this.server.emit('requestCreated', {
      type: 'REQUEST_CREATED',
      data: request,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Notified: New request created - ${request.id}`);

    // Send push notification to all admin users
    try {
      await this.notificationsService.sendNotificationToAll({
        title: '🔧 คำขอซ่อมใหม่',
        body: `${request.machine?.name || 'เครื่องจักร'}: ${request.description?.substring(0, 50) || 'ไม่มีรายละเอียด'}...`,
        icon: '/assets/icons/icon-192x192.png',
        url: `/requests/${request.id}`,
        tag: `request-${request.id}`,
        data: { requestId: request.id, type: 'REQUEST_CREATED' },
      });
    } catch (error) {
      this.logger.error('Failed to send push notification for new request', error);
    }
  }

  async notifyRequestAssigned(request: MaintenanceRequest) {
    this.server.emit('requestAssigned', {
      type: 'REQUEST_ASSIGNED',
      data: request,
      timestamp: new Date().toISOString(),
    });

    // Notify specific technician via WebSocket
    if (request.assignedTo) {
      this.server.to(`technician-${request.assignedTo}`).emit('newAssignment', {
        type: 'NEW_ASSIGNMENT',
        data: request,
        timestamp: new Date().toISOString(),
      });

      // Send push notification to assigned technician
      try {
        await this.notificationsService.sendNotificationToUser(request.assignedTo, {
          title: '🛠️ งานใหม่ที่ได้รับมอบหมาย',
          body: `คุณได้รับมอบหมายให้ดูแล: ${request.machine?.name || 'เครื่องจักร'}`,
          icon: '/assets/icons/icon-192x192.png',
          url: `/requests/${request.id}`,
          tag: `assignment-${request.id}`,
          data: { requestId: request.id, type: 'NEW_ASSIGNMENT' },
        });
      } catch (error) {
        this.logger.error('Failed to send push notification for assignment', error);
      }
    }

    this.logger.log(`Notified: Request ${request.id} assigned`);
  }

  async notifyStatusChanged(request: MaintenanceRequest, oldStatus: Status) {
    this.server.emit('statusChanged', {
      type: 'STATUS_CHANGED',
      data: {
        request,
        oldStatus,
        newStatus: request.status,
      },
      timestamp: new Date().toISOString(),
    });

    // Notify specific request room
    this.server.to(`request-${request.id}`).emit('requestUpdated', {
      type: 'REQUEST_UPDATED',
      data: request,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Notified: Request ${request.id} status changed from ${oldStatus} to ${request.status}`,
    );

    // Send push notification to request creator
    if (request.requestedBy) {
      try {
        const statusMessages: Record<string, string> = {
          [Status.OPEN]: 'เปิดคำขอใหม่',
          [Status.IN_PROGRESS]: 'กำลังดำเนินการ',
          [Status.COMPLETED]: 'เสร็จสิ้น',
          [Status.CANCELED]: 'ยกเลิก',
        };

        await this.notificationsService.sendNotificationToUser(request.requestedBy, {
          title: `📋 อัพเดตสถานะคำขอซ่อม`,
          body: `${request.machine?.name || 'เครื่องจักร'}: ${statusMessages[request.status] || request.status}`,
          icon: '/assets/icons/icon-192x192.png',
          url: `/requests/${request.id}`,
          tag: `status-${request.id}`,
          data: { requestId: request.id, type: 'STATUS_CHANGED', newStatus: request.status },
        });
      } catch (error) {
        this.logger.error('Failed to send push notification for status change', error);
      }
    }
  }
}
