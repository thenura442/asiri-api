import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { haversineDistance } from '../../common/utils/haversine.util';

export interface AvailableSlot {
  branchId: string;
  branchName: string;
  distanceKm: number;
  slots: string[];
}

@Injectable()
export class SlotAvailabilityService {
  constructor(private prisma: PrismaService) {}

  async getAvailableSlots(
    date: string,
    latitude: number,
    longitude: number,
    radiusKm = 10,
  ): Promise<AvailableSlot[]> {
    // Get all online branches
    const branches = await this.prisma.branch.findMany({
      where: { isOnline: true },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        operatingStart: true,
        operatingEnd: true,
        maxDailyCapacity: true,
      },
    });

    // Filter by radius
    const nearby = branches
      .map((b) => ({
        ...b,
        distanceKm: haversineDistance(
          latitude, longitude,
          Number(b.latitude), Number(b.longitude),
        ),
      }))
      .filter((b) => b.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const result: AvailableSlot[] = [];

    for (const branch of nearby) {
      // Count existing jobs for this branch on this date
      const existingJobs = await this.prisma.jobRequest.count({
        where: {
          branchId: branch.id,
          createdAt: { gte: targetDate, lt: nextDay },
          status: { notIn: ['cancelled', 'rejected', 'failed'] },
        },
      });

      const maxCapacity = branch.maxDailyCapacity ?? 20;
      if (existingJobs >= maxCapacity) continue;

      // Generate time slots based on operating hours
      const slots = this.generateTimeSlots(
        branch.operatingStart,
        branch.operatingEnd,
        date,
      );

      result.push({
        branchId: branch.id,
        branchName: branch.name,
        distanceKm: Math.round(branch.distanceKm * 10) / 10,
        slots,
      });
    }

    return result;
  }

  private generateTimeSlots(
    start: string,
    end: string,
    date: string,
  ): string[] {
    const slots: string[] = [];
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    let currentHour = startHour;
    let currentMin = startMin;

    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMin < endMin)
    ) {
      const hour = String(currentHour).padStart(2, '0');
      const min = String(currentMin).padStart(2, '0');
      slots.push(`${date}T${hour}:${min}:00`);

      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour += 1;
      }
    }

    return slots;
  }
}