import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { UserRole } from '../../common/enums/role.enum';
import { getInitials } from '../../common/utils/initials.util';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(user: any) {
    const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
    const branchFilter = isSuperAdmin ? {} : { branchId: user.branchId };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      unallocated,
      allocated,
      inProgress,
      completedToday,
      onlineDrivers,
      activeVehicles,
    ] = await Promise.all([
      // Unallocated — pending or queued
      this.prisma.jobRequest.count({
        where: { ...branchFilter, status: { in: ['pending', 'queued'] } },
      }),
      // Allocated — accepted or allocated
      this.prisma.jobRequest.count({
        where: { ...branchFilter, status: { in: ['accepted', 'allocated'] } },
      }),
      // In progress — dispatched through returning
      this.prisma.jobRequest.count({
        where: {
          ...branchFilter,
          status: {
            in: ['dispatched', 'en_route', 'arrived', 'collecting', 'collected', 'returning'],
          },
        },
      }),
      // Completed today
      this.prisma.jobRequest.count({
        where: {
          ...branchFilter,
          status: 'completed',
          completedAt: { gte: today, lt: tomorrow },
        },
      }),
      // Online drivers
      this.prisma.driver.count({
        where: { ...branchFilter, status: 'active', isAvailable: true },
      }),
      // Active vehicles
      this.prisma.vehicle.count({
        where: { ...branchFilter, status: 'busy' },
      }),
    ]);

    // Avg dispatch minutes (accepted → dispatched) today
    const dispatchedToday = await this.prisma.jobRequest.findMany({
      where: {
        ...branchFilter,
        dispatchedAt: { gte: today, lt: tomorrow },
        acceptedAt: { not: null },
      },
      select: { acceptedAt: true, dispatchedAt: true },
    });

    const avgDispatchMinutes =
      dispatchedToday.length > 0
        ? Math.round(
            dispatchedToday.reduce((sum, j) => {
              const diff =
                (j.dispatchedAt!.getTime() - j.acceptedAt!.getTime()) / 60000;
              return sum + diff;
            }, 0) / dispatchedToday.length,
          )
        : 0;

    const completionGoal = 200;

    return {
      unallocated,
      allocated,
      inProgress,
      completedToday,
      completionGoal,
      completionRate:
        completionGoal > 0 ? completedToday / completionGoal : 0,
      avgDispatchMinutes,
      onlineDrivers,
      activeVehicles,
    };
  }

  async getRecentJobs(user: any, limit = 3) {
    const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
    const where = isSuperAdmin ? {} : { branchId: user.branchId };

    const jobs = await this.prisma.jobRequest.findMany({
      where,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { fullName: true } },
        tests: { include: { test: { select: { name: true } } } },
      },
    });

    return jobs.map((job) => ({
      id: job.id,
      requestNumber: job.requestNumber,
      patientName: job.patient.fullName,
      patientInitials: getInitials(job.patient.fullName),
      testNames: job.tests.map((t) => t.test.name),
      status: job.status,
      urgency: job.urgency,
      createdAt: job.createdAt.toISOString(),
    }));
  }

  async getDrivers(user: any) {
    const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
    const where = isSuperAdmin ? {} : { branchId: user.branchId };

    const drivers = await this.prisma.driver.findMany({
      where: { ...where, status: 'active' },
      select: {
        id: true,
        fullName: true,
        status: true,
        isAvailable: true,
        vehicles: {
          select: { vehicleIdCode: true, status: true },
          where: { deletedAt: null },
          take: 1,
        },
        jobRequests: {
          where: {
            status: {
              notIn: ['completed', 'cancelled', 'rejected', 'failed'],
            },
          },
          select: { status: true },
          take: 1,
        },
      },
      orderBy: { fullName: 'asc' },
    });

    return drivers.map((d) => {
      const activeJob = d.jobRequests[0] ?? null;
      const vehicle = d.vehicles[0] ?? null;

      // Calculate job progress 0.0-1.0
      const progressMap: Record<string, number> = {
        accepted: 0.1, allocated: 0.2, dispatched: 0.3, en_route: 0.4,
        arrived: 0.5, collecting: 0.6, collected: 0.7, returning: 0.8,
        at_center: 0.85, sent_to_lab: 0.9,
      };

      return {
        id: d.id,
        initials: getInitials(d.fullName),
        fullName: d.fullName,
        vehicleCode: vehicle?.vehicleIdCode ?? 'Unassigned',
        status: d.status,
        isOnline: d.isAvailable,
        currentJobStatus: activeJob?.status ?? null,
        jobProgress: activeJob ? (progressMap[activeJob.status] ?? 0) : 0,
      };
    });
  }

  async getFleetLocations(user: any) {
    const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
    const branchFilter = isSuperAdmin ? {} : { branchId: user.branchId };

    // Get latest location for each active vehicle
    const activeJobs = await this.prisma.jobRequest.findMany({
      where: {
        ...branchFilter,
        status: { in: ['dispatched', 'en_route', 'arrived', 'collecting', 'returning'] },
        vehicleId: { not: null },
        driverId: { not: null },
      },
      select: {
        vehicleId: true,
        driverId: true,
        vehicle: {
          select: {
            vehicleIdCode: true,
            plateNumber: true,
            status: true,
          },
        },
        driver: {
          select: { fullName: true },
        },
      },
    });

    const result = await Promise.all(
      activeJobs.map(async (job) => {
        const latestLocation = await this.prisma.driverLocation.findFirst({
          where: { driverId: job.driverId! },
          orderBy: { recordedAt: 'desc' },
        });

        return {
          vehicleId: job.vehicleId!,
          vehicleCode: job.vehicle?.vehicleIdCode ?? job.vehicle?.plateNumber ?? '',
          driverName: job.driver?.fullName ?? '',
          status: job.vehicle?.status ?? 'busy',
          latitude: latestLocation ? Number(latestLocation.latitude) : null,
          longitude: latestLocation ? Number(latestLocation.longitude) : null,
          lastUpdatedAt: latestLocation?.recordedAt.toISOString() ?? null,
        };
      }),
    );

    return result.filter((r) => r.latitude !== null);
  }
}