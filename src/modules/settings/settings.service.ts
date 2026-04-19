import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.setting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async findOne(key: string) {
    const setting = await this.prisma.setting.findUnique({
      where: { key },
    });
    if (!setting) throw new NotFoundException(`Setting '${key}' not found`);
    return setting;
  }

  async update(key: string, value: string, userId: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) throw new NotFoundException(`Setting '${key}' not found`);

    return this.prisma.setting.update({
      where: { key },
      data: { value, updatedBy: userId },
    });
  }

  async updateMany(
    settings: { key: string; value: string }[],
    userId: string,
  ) {
    const updates = await Promise.all(
      settings.map((s) =>
        this.prisma.setting.update({
          where: { key: s.key },
          data: { value: s.value, updatedBy: userId },
        }),
      ),
    );
    return updates;
  }
}