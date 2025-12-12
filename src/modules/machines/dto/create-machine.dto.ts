import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMachineDto {
  @ApiProperty({ example: 'MC001', description: 'Unique machine code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'CNC Machine 1', description: 'Machine name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'High precision CNC machine for metal cutting', description: 'Machine description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Building A, Floor 2', description: 'Machine location' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  location?: string;
}
