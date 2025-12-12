import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingDto {
  @ApiPropertyOptional({ description: 'Setting value' })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({ description: 'Value type', enum: ['string', 'number', 'boolean', 'json'] })
  @IsOptional()
  @IsIn(['string', 'number', 'boolean', 'json'])
  type?: string;

  @ApiPropertyOptional({ description: 'Setting description' })
  @IsOptional()
  @IsString()
  description?: string;
}
