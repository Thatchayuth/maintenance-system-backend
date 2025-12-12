import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'Full name' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail({}, { message: 'กรุณากรอกอีเมลที่ถูกต้อง' })
  email?: string;
}

export class ChangePasswordDto {
  @ApiPropertyOptional({ description: 'Current password' })
  @IsString()
  currentPassword: string;

  @ApiPropertyOptional({ description: 'New password (min 6 characters)' })
  @IsString()
  @MinLength(6, { message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' })
  newPassword: string;
}
