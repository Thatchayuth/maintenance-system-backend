import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMaintenanceLogDto {
  @ApiProperty({ description: 'Maintenance request ID' })
  @IsUUID()
  @IsNotEmpty()
  requestId: string;

  @ApiProperty({ description: 'User ID who performed the action' })
  @IsUUID()
  @IsNotEmpty()
  actionBy: string;

  @ApiProperty({ description: 'Log message' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
