import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { UpdateDriverSettingsDto } from './dto/update-driver-settings.dto';

@Injectable()
export class DriverSettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(driverId: string) {
    let settings = await this.prisma.driverSettings.findUnique({
      where: { driverId },
    });

    if (!settings) {
      settings = await this.prisma.driverSettings.create({
        data: { driverId },
      });
    }

    return {
      pushNotifications: settings.pushEnabled,
      soundEnabled: settings.soundEnabled,
      vibrationEnabled: settings.vibrationEnabled,
      defaultMapsApp: (settings as any).mapType ?? 'google_maps',
      appVersion: '1.0.0',
    };
  }

  async updateSettings(driverId: string, dto: UpdateDriverSettingsDto) {
    // Map incoming defaultMapsApp → mapType for storage
    const data: any = {};
    if (dto.pushNotifications !== undefined) data.pushEnabled = dto.pushNotifications;
    if (dto.soundEnabled !== undefined) data.soundEnabled = dto.soundEnabled;
    if (dto.vibrationEnabled !== undefined) data.vibrationEnabled = dto.vibrationEnabled;
    if (dto.defaultMapsApp !== undefined) data.mapType = dto.defaultMapsApp;

    const settings = await this.prisma.driverSettings.upsert({
      where: { driverId },
      update: data,
      create: { driverId, ...data },
    });

    return {
      pushNotifications: settings.pushEnabled,
      soundEnabled: settings.soundEnabled,
      vibrationEnabled: settings.vibrationEnabled,
      defaultMapsApp: (settings as any).mapType ?? 'google_maps',
      appVersion: '1.0.0',
    };
  }
}