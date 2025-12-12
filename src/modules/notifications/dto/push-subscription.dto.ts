import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PushSubscriptionKeysDto {
  @ApiProperty({ description: 'P256DH key from push subscription' })
  @IsNotEmpty()
  @IsString()
  p256dh: string;

  @ApiProperty({ description: 'Auth key from push subscription' })
  @IsNotEmpty()
  @IsString()
  auth: string;
}

export class CreatePushSubscriptionDto {
  @ApiProperty({ description: 'Push subscription endpoint URL' })
  @IsNotEmpty()
  @IsString()
  endpoint: string;

  @ApiProperty({ description: 'Push subscription keys', type: PushSubscriptionKeysDto })
  @IsNotEmpty()
  keys: PushSubscriptionKeysDto;

  @ApiPropertyOptional({ description: 'Device name for identification' })
  @IsOptional()
  @IsString()
  deviceName?: string;
}

export class SendNotificationDto {
  @ApiProperty({ description: 'Notification title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification body message' })
  @IsNotEmpty()
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'Icon URL' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'URL to open when notification is clicked' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ description: 'Notification tag for grouping' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'Additional data payload' })
  @IsOptional()
  data?: Record<string, any>;
}
