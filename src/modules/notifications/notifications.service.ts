import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const webpush = require('web-push');
import { PushSubscription } from './entities/push-subscription.entity';
import { CreatePushSubscriptionDto, SendNotificationDto } from './dto';

// Generate VAPID keys once and store them in environment variables
// You can generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subscriptionRepo: Repository<PushSubscription>,
  ) {
    // Configure web-push
    webpush.setVapidDetails(
      'mailto:admin@maintenance-system.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY,
    );
  }

  getVapidPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  }

  async subscribe(
    userId: string,
    dto: CreatePushSubscriptionDto,
    ipAddress: string,
    userAgent?: string,
  ): Promise<PushSubscription> {
    // Check if subscription already exists for this endpoint
    let subscription = await this.subscriptionRepo.findOne({
      where: { endpoint: dto.endpoint },
    });

    if (subscription) {
      // Update existing subscription
      subscription.userId = userId;
      subscription.p256dhKey = dto.keys.p256dh;
      subscription.authKey = dto.keys.auth;
      subscription.ipAddress = ipAddress;
      if (userAgent) subscription.userAgent = userAgent;
      if (dto.deviceName) subscription.deviceName = dto.deviceName;
      subscription.isActive = true;
      subscription.lastUsed = new Date();
    } else {
      // Create new subscription
      subscription = this.subscriptionRepo.create({
        userId,
        endpoint: dto.endpoint,
        p256dhKey: dto.keys.p256dh,
        authKey: dto.keys.auth,
        ipAddress: ipAddress,
        userAgent: userAgent,
        deviceName: dto.deviceName,
        isActive: true,
        lastUsed: new Date(),
      });
    }

    return this.subscriptionRepo.save(subscription);
  }

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await this.subscriptionRepo.update(
      { userId, endpoint },
      { isActive: false },
    );
  }

  async unsubscribeAll(userId: string): Promise<void> {
    await this.subscriptionRepo.update(
      { userId },
      { isActive: false },
    );
  }

  async getSubscriptionsByUser(userId: string): Promise<PushSubscription[]> {
    return this.subscriptionRepo.find({
      where: { userId, isActive: true },
      order: { lastUsed: 'DESC' },
    });
  }

  async getSubscriptionsByIp(ipAddress: string): Promise<PushSubscription[]> {
    return this.subscriptionRepo.find({
      where: { ipAddress, isActive: true },
    });
  }

  async sendNotificationToUser(
    userId: string,
    notification: SendNotificationDto,
  ): Promise<{ success: number; failed: number }> {
    const subscriptions = await this.getSubscriptionsByUser(userId);
    return this.sendToSubscriptions(subscriptions, notification);
  }

  async sendNotificationToIp(
    ipAddress: string,
    notification: SendNotificationDto,
  ): Promise<{ success: number; failed: number }> {
    const subscriptions = await this.getSubscriptionsByIp(ipAddress);
    return this.sendToSubscriptions(subscriptions, notification);
  }

  async sendNotificationToMultipleUsers(
    userIds: string[],
    notification: SendNotificationDto,
  ): Promise<{ success: number; failed: number }> {
    const subscriptions = await this.subscriptionRepo
      .createQueryBuilder('sub')
      .where('sub.user_id IN (:...userIds)', { userIds })
      .andWhere('sub.is_active = :isActive', { isActive: true })
      .getMany();

    return this.sendToSubscriptions(subscriptions, notification);
  }

  async sendNotificationToAll(
    notification: SendNotificationDto,
  ): Promise<{ success: number; failed: number }> {
    const subscriptions = await this.subscriptionRepo.find({
      where: { isActive: true },
    });
    return this.sendToSubscriptions(subscriptions, notification);
  }

  private async sendToSubscriptions(
    subscriptions: PushSubscription[],
    notification: SendNotificationDto,
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/badge-72x72.png',
      url: notification.url || '/',
      tag: notification.tag,
      data: notification.data,
      timestamp: Date.now(),
    });

    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dhKey,
            auth: sub.authKey,
          },
        };

        await webpush.sendNotification(pushSubscription, payload);
        success++;

        // Update last used
        await this.subscriptionRepo.update(sub.id, { lastUsed: new Date() });
      } catch (error: any) {
        this.logger.error(`Failed to send notification to ${sub.endpoint}: ${error.message}`);
        failed++;

        // If subscription is no longer valid, mark it as inactive
        if (error.statusCode === 410 || error.statusCode === 404) {
          await this.subscriptionRepo.update(sub.id, { isActive: false });
        }
      }
    }

    return { success, failed };
  }

  async cleanupExpiredSubscriptions(): Promise<number> {
    // Remove subscriptions that haven't been used in 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.subscriptionRepo
      .createQueryBuilder()
      .delete()
      .where('last_used < :date', { date: thirtyDaysAgo })
      .orWhere('is_active = :isActive', { isActive: false })
      .execute();

    return result.affected || 0;
  }
}
