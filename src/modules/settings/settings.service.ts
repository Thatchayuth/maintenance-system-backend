import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Setting } from './entities/setting.entity';
import { CreateSettingDto, UpdateSettingDto, BulkUpdateSettingsDto } from './dto';

// Default settings
const DEFAULT_SETTINGS = [
  // General settings
  { key: 'siteName', value: 'Machine Maintenance System', type: 'string', category: 'general', description: 'ชื่อระบบ' },
  { key: 'siteDescription', value: 'ระบบแจ้งซ่อมเครื่องจักรและติดตามสถานะการซ่อมบำรุง', type: 'string', category: 'general', description: 'คำอธิบายระบบ' },
  { key: 'maintenanceMode', value: 'false', type: 'boolean', category: 'general', description: 'โหมดปิดปรับปรุงระบบ' },
  
  // User settings
  { key: 'allowRegistration', value: 'true', type: 'boolean', category: 'user', description: 'อนุญาตให้ลงทะเบียนใหม่' },
  { key: 'defaultUserRole', value: 'USER', type: 'string', category: 'user', description: 'Role เริ่มต้นสำหรับผู้ใช้ใหม่' },
  { key: 'sessionTimeout', value: '60', type: 'number', category: 'user', description: 'เวลา Session หมดอายุ (นาที)' },
  
  // Notification settings
  { key: 'emailNotifications', value: 'true', type: 'boolean', category: 'notification', description: 'เปิดการแจ้งเตือนทาง Email' },
  { key: 'autoAssignTechnician', value: 'false', type: 'boolean', category: 'notification', description: 'มอบหมายช่างอัตโนมัติ' },
  
  // System settings
  { key: 'maxUploadSize', value: '10', type: 'number', category: 'system', description: 'ขนาดไฟล์สูงสุดที่อัพโหลดได้ (MB)' },
];

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>,
  ) {}

  async onModuleInit() {
    await this.initializeDefaultSettings();
  }

  private async initializeDefaultSettings(): Promise<void> {
    for (const setting of DEFAULT_SETTINGS) {
      const exists = await this.settingRepository.findOne({ where: { key: setting.key } });
      if (!exists) {
        await this.settingRepository.save(setting);
      }
    }
  }

  async findAll(): Promise<Setting[]> {
    return this.settingRepository.find({ order: { category: 'ASC', key: 'ASC' } });
  }

  async findByCategory(category: string): Promise<Setting[]> {
    return this.settingRepository.find({ where: { category }, order: { key: 'ASC' } });
  }

  async findByKey(key: string): Promise<Setting | null> {
    return this.settingRepository.findOne({ where: { key } });
  }

  async getValue(key: string): Promise<string | null> {
    const setting = await this.findByKey(key);
    return setting?.value || null;
  }

  async getValueTyped<T>(key: string): Promise<T | null> {
    const setting = await this.findByKey(key);
    if (!setting) return null;

    switch (setting.type) {
      case 'number':
        return Number(setting.value) as T;
      case 'boolean':
        return (setting.value === 'true') as T;
      case 'json':
        return JSON.parse(setting.value) as T;
      default:
        return setting.value as T;
    }
  }

  async create(dto: CreateSettingDto): Promise<Setting> {
    const setting = this.settingRepository.create(dto);
    return this.settingRepository.save(setting);
  }

  async update(key: string, dto: UpdateSettingDto): Promise<Setting> {
    const setting = await this.findByKey(key);
    if (!setting) {
      // Create if not exists
      return this.create({ key, value: dto.value || '', ...dto });
    }
    Object.assign(setting, dto);
    return this.settingRepository.save(setting);
  }

  async setValue(key: string, value: string): Promise<Setting> {
    return this.update(key, { value });
  }

  async bulkUpdate(dto: BulkUpdateSettingsDto): Promise<Setting[]> {
    const results: Setting[] = [];
    for (const item of dto.settings) {
      const result = await this.setValue(item.key, item.value);
      results.push(result);
    }
    return results;
  }

  async delete(key: string): Promise<void> {
    await this.settingRepository.delete({ key });
  }

  // Get all settings as a key-value object
  async getAllAsObject(): Promise<Record<string, any>> {
    const settings = await this.findAll();
    const result: Record<string, any> = {};
    
    for (const setting of settings) {
      switch (setting.type) {
        case 'number':
          result[setting.key] = Number(setting.value);
          break;
        case 'boolean':
          result[setting.key] = setting.value === 'true';
          break;
        case 'json':
          try {
            result[setting.key] = JSON.parse(setting.value);
          } catch {
            result[setting.key] = setting.value;
          }
          break;
        default:
          result[setting.key] = setting.value;
      }
    }
    
    return result;
  }

  // Get settings by category as object
  async getCategoryAsObject(category: string): Promise<Record<string, any>> {
    const settings = await this.findByCategory(category);
    const result: Record<string, any> = {};
    
    for (const setting of settings) {
      switch (setting.type) {
        case 'number':
          result[setting.key] = Number(setting.value);
          break;
        case 'boolean':
          result[setting.key] = setting.value === 'true';
          break;
        case 'json':
          try {
            result[setting.key] = JSON.parse(setting.value);
          } catch {
            result[setting.key] = setting.value;
          }
          break;
        default:
          result[setting.key] = setting.value;
      }
    }
    
    return result;
  }
}
