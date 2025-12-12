import { IsString, IsNotEmpty, MaxLength, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority } from '../../../common/enums/priority.enum';

export class CreateMaintenanceRequestDto {
  @ApiProperty({ example: 'uuid-of-machine', description: 'Machine ID' })
  //@IsUUID()
  @IsNotEmpty()
  machineId: string;

  @ApiProperty({ example: 'Machine not working', description: 'Request title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'The machine stopped working this morning...', description: 'Request description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ enum: Priority, example: Priority.MEDIUM, description: 'Request priority' })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiPropertyOptional({ example: 'http://example.com/image.jpg', description: 'Image URL' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  imageUrl?: string;
}
