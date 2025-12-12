import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSettingDto {
  @ApiProperty({ description: 'Setting key (unique identifier)' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Setting value' })
  @IsString()
  value: string;

  @ApiPropertyOptional({ description: 'Value type', enum: ['string', 'number', 'boolean', 'json'] })
  @IsOptional()
  @IsIn(['string', 'number', 'boolean', 'json'])
  type?: string;

  @ApiPropertyOptional({ description: 'Setting description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Setting category', enum: ['general', 'user', 'notification', 'system'] })
  @IsOptional()
  @IsIn(['general', 'user', 'notification', 'system'])
  category?: string;
}
