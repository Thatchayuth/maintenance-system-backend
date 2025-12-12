import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  constructor(private readonly configService: ConfigService) {}

  getFileUrl(filename: string): string {
    const baseUrl = `http://localhost:${this.configService.get('APP_PORT') || 3000}`;
    return `${baseUrl}/uploads/${filename}`;
  }

  async deleteFile(filename: string): Promise<void> {
    const uploadDest = this.configService.get('UPLOAD_DEST') || './uploads';
    const filePath = path.join(uploadDest, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    } else {
      throw new NotFoundException('File not found');
    }
  }

  ensureUploadDir(): void {
    const uploadDest = this.configService.get('UPLOAD_DEST') || './uploads';
    if (!fs.existsSync(uploadDest)) {
      fs.mkdirSync(uploadDest, { recursive: true });
    }
  }
}
