import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { EventsService } from '../events/events.service';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class DriverLocationService {
  constructor(
    private prisma: PrismaService,
    private events: EventsService,
  ) {}

  async updateLocation(driverId: string, dto: UpdateLocationDto) {
    // Store location record
    const location = await this.prisma.driverLocation.create({
      data: {
        driverId,
        jobRequestId: dto.jobRequestId,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    // Publish to realtime if on active job
    if (dto.jobRequestId) {
      await this.events.job.publishDriverLocation(
        dto.jobRequestId,
        driverId,
        dto.latitude,
        dto.longitude,
      );
    }

    return location;
  }

  async getLatestLocation(driverId: string) {
    return this.prisma.driverLocation.findFirst({
      where: { driverId },
      orderBy: { recordedAt: 'desc' },
    });
  }
}