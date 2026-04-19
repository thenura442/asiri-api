import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { FilterBookingsDto } from './dto/filter-bookings.dto';
import { calculateAge } from '../../common/utils/age-calculator.util';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async getHome(patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    // Stats
    const [totalBookings, totalReports, activeBookings] = await Promise.all([
      this.prisma.jobRequest.count({ where: { patientId } }),
      this.prisma.jobRequest.count({
        where: { patientId, status: 'completed' },
      }),
      this.prisma.jobRequest.count({
        where: {
          patientId,
          status: {
            notIn: ['completed', 'cancelled', 'rejected', 'failed'],
          },
        },
      }),
    ]);

    // Active booking
    const activeBooking = await this.prisma.jobRequest.findFirst({
      where: {
        patientId,
        status: { notIn: ['completed', 'cancelled', 'rejected', 'failed'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        tests: { include: { test: { select: { name: true } } } },
        driver: { select: { id: true, fullName: true, phone: true } },
      },
    });

    // Recent bookings (last 3 completed)
    const recentBookings = await this.prisma.jobRequest.findMany({
      where: { patientId, status: 'completed' },
      take: 3,
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        requestNumber: true,
        status: true,
        completedAt: true,
        totalPrice: true,
        tests: { include: { test: { select: { name: true } } } },
      },
    });

    const nameParts = patient.fullName.trim().split(' ');
    const firstName = nameParts[0];

    return {
      profile: {
        fullName: patient.fullName,
        firstName,
        avatarUrl: null,
      },
      stats: {
        totalBookings,
        totalReports,
        activeBookings,
      },
      pendingCharges: Number(patient.pendingCharges) > 0
        ? Number(patient.pendingCharges)
        : null,
      pendingChargeReason: Number(patient.pendingCharges) > 0
        ? 'Late cancellation fee'
        : null,
      activeBooking: activeBooking
        ? {
            id: activeBooking.id,
            requestNumber: activeBooking.requestNumber,
            status: activeBooking.status,
            tests: activeBooking.tests.map((t) => t.test.name),
            testCount: activeBooking.tests.length,
            location: '',
            etaMinutes: null,
            driverName: activeBooking.driver?.fullName ?? null,
            progressSteps: [],
          }
        : null,
      recentBookings: recentBookings.map((b) => ({
        id: b.id,
        requestNumber: b.requestNumber,
        tests: b.tests.map((t) => t.test.name),
        testCount: b.tests.length,
        date: b.completedAt?.toISOString() ?? '',
        status: b.status,
        totalPrice: Number(b.totalPrice),
      })),
    };
  }

  async getProfile(patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return {
      ...patient,
      age: calculateAge(patient.dateOfBirth),
      biometricEnabled: false,
    };
  }

  async updateProfile(patientId: string, dto: UpdateCustomerProfileDto) {
    const data: any = { ...dto };
    if (dto.dateOfBirth) data.dateOfBirth = new Date(dto.dateOfBirth);
    return this.prisma.patient.update({ where: { id: patientId }, data });
  }

  async getBookings(patientId: string, dto: FilterBookingsDto) {
    const { page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;
    const where: any = { patientId };

    if (dto.status && dto.status !== 'all') {
      if (dto.status === 'active') {
        where.status = {
          notIn: ['completed', 'cancelled', 'rejected', 'failed'],
        };
      } else {
        where.status = dto.status;
      }
    }

    if (dto.dateFrom || dto.dateTo) {
      where.createdAt = {};
      if (dto.dateFrom) where.createdAt.gte = new Date(dto.dateFrom);
      if (dto.dateTo) where.createdAt.lte = new Date(dto.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.jobRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tests: {
            include: { test: { select: { name: true, code: true } } },
          },
          branch: { select: { id: true, name: true, phone: true } },
          driver: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.jobRequest.count({ where }),
    ]);

    return {
      data: data.map((b) => ({
        id: b.id,
        requestNumber: b.requestNumber,
        tests: b.tests.map((t) => t.test.name),
        testCount: b.tests.length,
        date: b.createdAt.toISOString(),
        scheduledAt: b.scheduledAt?.toISOString() ?? null,
        status: b.status,
        location: b.address,
        totalPrice: Number(b.totalPrice),
        etaMinutes: null,
        driverName: b.driver?.fullName ?? null,
      })),
      meta: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + limit < total,
        hasPrev: page > 1,
      },
    };
  }
}