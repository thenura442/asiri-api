import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AssignmentService } from '../job-requests/assignment.service';
import { PricingService } from '../job-requests/pricing.service';
import { TimelineService } from '../job-requests/timeline.service';
import { SlotAvailabilityService } from './slot-availability.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CalculatePriceDto } from './dto/calculate-price.dto';
import { AvailableSlotsQueryDto } from './dto/available-slots-query.dto';
import { generateRequestNumber } from '../../common/utils/request-number.util';
import { haversineDistance } from '../../common/utils/haversine.util';

@Injectable()
export class BookingService {
  constructor(
    private prisma: PrismaService,
    private assignmentService: AssignmentService,
    private pricingService: PricingService,
    private timelineService: TimelineService,
    private slotAvailability: SlotAvailabilityService,
  ) {}

  async getAvailableSlots(dto: AvailableSlotsQueryDto) {
    return this.slotAvailability.getAvailableSlots(
      dto.date,
      dto.latitude,
      dto.longitude,
      dto.radiusKm,
    );
  }

  async calculatePrice(dto: CalculatePriceDto) {
    return this.pricingService.calculatePrice(
      dto.testIds,
      dto.distanceKm,
      dto.isExternalTransport,
      dto.externalTransportFare,
    );
  }

  async createBooking(dto: CreateBookingDto, patientId: string) {
    // Validate patient
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    // Check pending charges
    if (Number(patient.pendingCharges) > 0) {
      throw new BadRequestException(
        `You have a pending charge of Rs. ${patient.pendingCharges} from a previous booking`,
      );
    }

    // Validate tests
    const tests = await this.prisma.test.findMany({
      where: { id: { in: dto.testIds }, isActive: true },
    });
    if (tests.length !== dto.testIds.length) {
      throw new BadRequestException('One or more tests not found or inactive');
    }

    // Check prescription requirements
    const requiresPrescription = tests.some((t) => t.prescriptionReq);
    if (requiresPrescription && !dto.prescriptionUrl) {
      throw new BadRequestException(
        'One or more selected tests require a prescription',
      );
    }

    // Find nearest branch
    const branchId = await this.assignmentService.findNearestBranch(
      dto.latitude,
      dto.longitude,
    );

    // Calculate distance
    let distanceKm = 0;
    let labId: string | null = null;

    if (branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: branchId },
        select: { latitude: true, longitude: true, defaultLabId: true },
      });
      if (branch) {
        distanceKm = haversineDistance(
          dto.latitude, dto.longitude,
          Number(branch.latitude), Number(branch.longitude),
        );
        labId = branch.defaultLabId ?? null;
      }
    }

    // Calculate pricing
    const pricing = await this.pricingService.calculatePrice(
      dto.testIds,
      distanceKm,
      dto.isExternalTransport,
      dto.externalTransportFare,
    );

    // Create booking
    const jobRequest = await this.prisma.jobRequest.create({
      data: {
        requestNumber: generateRequestNumber(),
        patientId,
        branchId,
        labId,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        isScheduled: dto.isScheduled ?? false,
        status: branchId ? 'pending' : 'queued',
        urgency: dto.urgency ?? 'normal',
        basePrice: pricing.basePrice,
        distanceKm,
        perKmRate: pricing.perKmRate,
        transportFee: pricing.transportFee,
        totalPrice: pricing.totalPrice,
        isExternalTransport: dto.isExternalTransport ?? false,
        prescriptionUrl: dto.prescriptionUrl,
        tests: {
          create: dto.testIds.map((testId) => ({ testId })),
        },
      },
      include: {
        tests: { include: { test: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    // Initialize timeline
    await this.timelineService.initializeTimeline(jobRequest.id);

    return jobRequest;
  }

  async getMyBookings(patientId: string, status?: string) {
    const where: any = { patientId };
    if (status) where.status = status;

    return this.prisma.jobRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        tests: {
          include: { test: { select: { id: true, name: true, code: true } } },
        },
        branch: { select: { id: true, name: true } },
        driver: { select: { id: true, fullName: true, phone: true } },
      },
    });
  }

  async getBookingDetail(jobId: string, patientId: string) {
    const job = await this.prisma.jobRequest.findFirst({
      where: { id: jobId, patientId },
      include: {
        tests: { include: { test: true } },
        branch: { select: { id: true, name: true } },
        driver: { select: { id: true, fullName: true, phone: true } },
        vehicle: { select: { id: true, plateNumber: true } },
        timeline: { orderBy: { stepNumber: 'asc' } },
      },
    });

    if (!job) throw new NotFoundException('Booking not found');
    return job;
  }

  async cancelBooking(
    jobId: string,
    patientId: string,
    dto: CancelBookingDto,
  ) {
    const job = await this.prisma.jobRequest.findFirst({
      where: { id: jobId, patientId },
    });

    if (!job) throw new NotFoundException('Booking not found');

    const cancellableStatuses = ['pending', 'queued', 'accepted', 'allocated'];
    if (!cancellableStatuses.includes(job.status)) {
      throw new BadRequestException(
        `Cannot cancel a booking with status: ${job.status}`,
      );
    }

    // Late cancellation if driver already dispatched
    const isLate = ['dispatched', 'en_route', 'arrived'].includes(job.status);
    const lateSetting = await this.prisma.setting.findUnique({
      where: { key: 'late_cancellation_fee' },
    });
    const lateFee = parseFloat(lateSetting?.value ?? '500');

    // Free vehicle if allocated
    if (job.vehicleId) {
      await this.prisma.vehicle.update({
        where: { id: job.vehicleId },
        data: { status: 'available' },
      });
    }

    // Add late fee to patient pending charges
    if (isLate) {
      await this.prisma.patient.update({
        where: { id: patientId },
        data: { pendingCharges: { increment: lateFee } },
      });
    }

    return this.prisma.jobRequest.update({
      where: { id: jobId },
      data: {
        status: 'cancelled',
        cancelledBy: 'customer',
        cancellationReason: dto.reason,
        lateCancellation: isLate,
        lateCancelFee: isLate ? lateFee : 0,
      },
    });
  }

  async trackBooking(jobId: string, patientId: string) {
    return this.getBookingDetail(jobId, patientId);
  }
}