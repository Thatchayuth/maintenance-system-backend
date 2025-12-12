import { IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class SettingItem {
  @ApiProperty({ description: 'Setting key' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Setting value' })
  @IsString()
  value: string;
}

export class BulkUpdateSettingsDto {
  @ApiProperty({ type: [SettingItem], description: 'Array of settings to update' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingItem)
  settings: SettingItem[];
}
