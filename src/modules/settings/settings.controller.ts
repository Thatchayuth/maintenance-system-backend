import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { SettingsService } from './settings.service';
import { CreateSettingDto, UpdateSettingDto, BulkUpdateSettingsDto } from './dto';
import { Setting } from './entities/setting.entity';

@ApiTags('Settings')
@ApiBearerAuth('JWT-auth')
@Controller('api/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all settings' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiResponse({ status: 200, description: 'List of settings' })
  async findAll(@Query('category') category?: string): Promise<Setting[]> {
    if (category) {
      return this.settingsService.findByCategory(category);
    }
    return this.settingsService.findAll();
  }

  @Get('object')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all settings as key-value object' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiResponse({ status: 200, description: 'Settings as object' })
  async getAllAsObject(@Query('category') category?: string): Promise<Record<string, any>> {
    if (category) {
      return this.settingsService.getCategoryAsObject(category);
    }
    return this.settingsService.getAllAsObject();
  }

  @Get(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get setting by key' })
  @ApiResponse({ status: 200, description: 'Setting details' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async findByKey(@Param('key') key: string): Promise<Setting | null> {
    return this.settingsService.findByKey(key);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create new setting' })
  @ApiResponse({ status: 201, description: 'Setting created' })
  async create(@Body() dto: CreateSettingDto): Promise<Setting> {
    return this.settingsService.create(dto);
  }

  @Put('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Bulk update settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async bulkUpdate(@Body() dto: BulkUpdateSettingsDto): Promise<Setting[]> {
    return this.settingsService.bulkUpdate(dto);
  }

  @Put(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update setting by key' })
  @ApiResponse({ status: 200, description: 'Setting updated' })
  async update(@Param('key') key: string, @Body() dto: UpdateSettingDto): Promise<Setting> {
    return this.settingsService.update(key, dto);
  }

  @Delete(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete setting by key' })
  @ApiResponse({ status: 200, description: 'Setting deleted' })
  async delete(@Param('key') key: string): Promise<void> {
    return this.settingsService.delete(key);
  }
}
