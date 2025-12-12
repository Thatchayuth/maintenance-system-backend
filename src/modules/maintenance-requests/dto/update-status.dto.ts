import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Status } from '../../../common/enums/status.enum';

export class UpdateStatusDto {
  @ApiProperty({ enum: Status, example: Status.IN_PROGRESS, description: 'New status' })
  @IsEnum(Status)
  @IsNotEmpty()
  status: Status;

  @ApiPropertyOptional({ example: 'Started working on the issue', description: 'Optional message for the log' })
  @IsString()
  @IsOptional()
  message?: string;
}
