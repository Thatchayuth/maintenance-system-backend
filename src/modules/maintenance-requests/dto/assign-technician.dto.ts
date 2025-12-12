import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignTechnicianDto {
  @ApiProperty({ example: 'uuid-of-technician', description: 'Technician user ID' })
 // @IsUUID()
  @IsNotEmpty()
  technicianId: string;
}
