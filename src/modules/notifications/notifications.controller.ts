import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { NotificationsService } from './notifications.service';
import { CreatePushSubscriptionDto, SendNotificationDto } from './dto';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Get VAPID public key for push subscription' })
  @ApiResponse({ status: 200, description: 'VAPID public key' })
  getVapidPublicKey(): { publicKey: string } {
    return { publicKey: this.notificationsService.getVapidPublicKey() };
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Subscribe to push notifications' })
  @ApiResponse({ status: 201, description: 'Subscription created' })
  async subscribe(
    @Req() req: Request,
    @Body() dto: CreatePushSubscriptionDto,
  ) {
    const userId = (req.user as any).sub;
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    const subscription = await this.notificationsService.subscribe(
      userId,
      dto,
      ipAddress,
      userAgent,
    );

    return {
      message: 'Successfully subscribed to push notifications',
      subscriptionId: subscription.id,
      ipAddress: ipAddress,
    };
  }

  @Delete('unsubscribe')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unsubscribe from push notifications' })
  @ApiResponse({ status: 204, description: 'Subscription removed' })
  async unsubscribe(
    @Req() req: Request,
    @Body('endpoint') endpoint: string,
  ) {
    const userId = (req.user as any).sub;
    await this.notificationsService.unsubscribe(userId, endpoint);
  }

  @Delete('unsubscribe-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unsubscribe all devices from push notifications' })
  @ApiResponse({ status: 204, description: 'All subscriptions removed' })
  async unsubscribeAll(@Req() req: Request) {
    const userId = (req.user as any).sub;
    await this.notificationsService.unsubscribeAll(userId);
  }

  @Get('subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user push subscriptions' })
  @ApiResponse({ status: 200, description: 'List of subscriptions' })
  async getSubscriptions(@Req() req: Request) {
    const userId = (req.user as any).sub;
    const subscriptions = await this.notificationsService.getSubscriptionsByUser(userId);
    
    return subscriptions.map(sub => ({
      id: sub.id,
      deviceName: sub.deviceName,
      ipAddress: sub.ipAddress,
      lastUsed: sub.lastUsed,
      createdAt: sub.createdAt,
    }));
  }

  @Post('send/user/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Send notification to specific user (Admin only)' })
  @ApiResponse({ status: 200, description: 'Notification sent' })
  async sendToUser(
    @Param('userId') userId: string,
    @Body() dto: SendNotificationDto,
  ) {
    const result = await this.notificationsService.sendNotificationToUser(userId, dto);
    return {
      message: 'Notification sent',
      ...result,
    };
  }

  @Post('send/broadcast')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Send notification to all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'Notification broadcast sent' })
  async broadcast(@Body() dto: SendNotificationDto) {
    const result = await this.notificationsService.sendNotificationToAll(dto);
    return {
      message: 'Broadcast notification sent',
      ...result,
    };
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Send test notification to current user' })
  @ApiResponse({ status: 200, description: 'Test notification sent' })
  async sendTestNotification(@Req() req: Request) {
    const userId = (req.user as any).sub;
    const result = await this.notificationsService.sendNotificationToUser(userId, {
      title: '🔔 ทดสอบการแจ้งเตือน',
      body: 'ระบบแจ้งเตือน Push Notification ทำงานปกติ!',
      icon: '/assets/icons/icon-192x192.png',
      url: '/dashboard',
      tag: 'test-notification',
    });
    return {
      message: 'Test notification sent',
      ...result,
    };
  }

  private getClientIp(req: Request): string {
    // Check various headers for client IP
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = (forwarded as string).split(',');
      return ips[0].trim();
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return realIp as string;
    }

    // Fallback to connection remote address
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
}
