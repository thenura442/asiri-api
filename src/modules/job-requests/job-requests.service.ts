import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { AllocateJobDto } from './dto/allocate-job.dto';
import { RejectJobDto } from './dto/reject-job.dto';
import { CancelJobDto } from './dto/cancel-job.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { FilterJobsDto } from './dto/filter-jobs.dto';
import { AssignmentService } from './assignment.service';
import { TimelineService } from './timeline.service';
import { PricingService } from './pricing.service';
import { canTransition } from '../../common/utils/state-machine.util';
import { generateRequestNumber } from '../../common/utils/request-number.util';
import { JobStatus } from '../../common/enums/job-status.enum';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class JobRequestsService {
  constructor(
    private prisma: PrismaService,
    private assignmentService: AssignmentService,
    private timelineService: TimelineService,
    private pricingService: PricingService,
  ) {}

  async create(dto: CreateJobDto, createdByUserId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId },
    });
    if (!patient) throw new BadRequestException('Patient not found');

    const tests = await this.prisma.test.findMany({
      where: { id: { in: dto.testIds }, isActive: true },
    });
    if (tests.length !== dto.testIds.length) {
      throw new BadRequestException('One or more tests not found or inactive');
    }

    const requiresPrescription = tests.some((t) => t.prescriptionReq);
    if (requiresPrescription && !dto.prescriptionUrl) {
      throw new BadRequestException('One or more tests require a prescription upload');
    }

    let branchId: string | null = null;
    let distanceKm = 0;

    if (dto.latitude && dto.longitude) {
      branchId = await this.assignmentService.findNearestBranch(dto.latitude, dto.longitude);
      if (branchId) {
        const branch = await this.prisma.branch.findFirst({
          where: { id: branchId },
          select: { latitude: true, longitude: true },
        });
        if (branch) {
          const { haversineDistance } = await import('../../common/utils/haversine.util');
          distanceKm = haversineDistance(
            dto.latitude, dto.longitude,
            Number(branch.latitude), Number(branch.longitude),
          );
        }
      }
    }

    const pricing = await this.pricingService.calculatePrice(
      dto.testIds, distanceKm, dto.isExternalTransport,
      dto.isExternalTransport ? dto.externalTransportFare : 0,
    );

    let labId: string | null = null;
    if (branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: branchId },
        select: { defaultLabId: true },
      });
      labId = branch?.defaultLabId ?? null;
    }

    const jobRequest = await this.prisma.jobRequest.create({
      data: {
        requestNumber:       generateRequestNumber(),
        patientId:           dto.patientId,
        branchId,
        labId,
        address:             dto.address,
        latitude:            dto.latitude,
        longitude:           dto.longitude,
        scheduledAt:         dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        isScheduled:         dto.isScheduled ?? false,
        status:              branchId ? 'pending' : 'queued',
        urgency:             dto.urgency ?? 'normal',
        basePrice:           pricing.basePrice,
        distanceKm,
        perKmRate:           pricing.perKmRate,
        transportFee:        pricing.transportFee,
        totalPrice:          pricing.totalPrice,
        isExternalTransport: dto.isExternalTransport ?? false,
        prescriptionUrl:     dto.prescriptionUrl,
        tests: { create: dto.testIds.map((testId) => ({ testId })) },
      },
      include: {
        patient: { select: { id: true, fullName: true, phone: true } },
        branch:  { select: { id: true, name: true } },
        tests:   { include: { test: true } },
      },
    });

    await this.timelineService.initializeTimeline(jobRequest.id);
    await this.timelineService.advanceStep(jobRequest.id, 1, createdByUserId);

    return jobRequest;
  }

  async findAll(
    dto: FilterJobsDto,
    userBranchId?: string,
    isSuperAdmin?: boolean,
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (dto.status)    where.status  = dto.status;
    if (dto.urgency)   where.urgency = dto.urgency;
    if (dto.isScheduled !== undefined) where.isScheduled = dto.isScheduled;
    if (dto.branchId && isSuperAdmin)  where.branchId    = dto.branchId;
    if (!isSuperAdmin && userBranchId) where.branchId    = userBranchId;
    if (dto.dateFrom || dto.dateTo) {
      where.createdAt = {};
      if (dto.dateFrom) where.createdAt.gte = new Date(dto.dateFrom);
      if (dto.dateTo)   where.createdAt.lte = new Date(dto.dateTo);
    }
    if (dto.search) {
      where.OR = [
        { requestNumber: { contains: dto.search, mode: 'insensitive' } },
        { patient: { fullName: { contains: dto.search, mode: 'insensitive' } } },
        { patient: { uhid:     { contains: dto.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.jobRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          patient: { select: { id: true, fullName: true, phone: true, uhid: true } },
          branch:  { select: { id: true, name: true } },
          driver:  { select: { id: true, fullName: true, phone: true } },
          vehicle: { select: { id: true, plateNumber: true } },
          tests:   { include: { test: { select: { id: true, name: true, code: true } } } },
        },
      }),
      this.prisma.jobRequest.count({ where }),
    ]);

    return {
      data,
      meta: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const job = await this.prisma.jobRequest.findFirst({
      where: { id },
      include: {
        patient:    true,
        branch:     { select: { id: true, name: true, type: true } },
        driver:     { select: { id: true, fullName: true, phone: true } },
        vehicle:    { select: { id: true, plateNumber: true, vehicleIdCode: true } },
        lab:        { select: { id: true, name: true } },
        tests:      { include: { test: true } },
        timeline:   { orderBy: { stepNumber: 'asc' } },
        escalations: true,
      },
    });

    if (!job) throw new NotFoundException('Job request not found');
    return job;
  }

  async accept(id: string, userId: string) {
    const job = await this.findOne(id);

    if (!canTransition(job.status as JobStatus, JobStatus.ACCEPTED)) {
      throw new UnprocessableEntityException(`Cannot transition from ${job.status} to accepted`);
    }

    const updated = await this.prisma.jobRequest.update({
      where: { id },
      data:  { status: 'accepted', acceptedAt: new Date() },
    });

    await this.timelineService.advanceStep(id, 2, userId);
    await this.timelineService.advanceStep(id, 3, userId);

    return updated;
  }

  async reject(id: string, dto: RejectJobDto, userId: string) {
    const job = await this.findOne(id);

    if (!canTransition(job.status as JobStatus, JobStatus.REJECTED)) {
      throw new UnprocessableEntityException(`Cannot transition from ${job.status} to rejected`);
    }

    return this.prisma.jobRequest.update({
      where: { id },
      data:  { status: 'rejected', rejectionReason: dto.reason },
    });
  }

  async allocate(id: string, dto: AllocateJobDto, userId: string) {
    const job = await this.findOne(id);

    if (!canTransition(job.status as JobStatus, JobStatus.ALLOCATED)) {
      throw new UnprocessableEntityException(`Cannot transition from ${job.status} to allocated`);
    }

    const driver = await this.prisma.driver.findFirst({ where: { id: dto.driverId, status: 'active' } });
    if (!driver) throw new BadRequestException('Driver not found or not active');

    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId, status: 'available' } });
    if (!vehicle) throw new BadRequestException('Vehicle not found or not available');

    const updated = await this.prisma.jobRequest.update({
      where: { id },
      data:  { status: 'allocated', driverId: dto.driverId, vehicleId: dto.vehicleId },
    });

    await this.prisma.vehicle.update({
      where: { id: dto.vehicleId },
      data:  { status: 'busy' },
    });

    await this.timelineService.advanceStep(id, 4, userId);

    return updated;
  }

  async cancel(id: string, dto: CancelJobDto, userId: string) {
    const job = await this.findOne(id);

    if (!canTransition(job.status as JobStatus, JobStatus.CANCELLED)) {
      throw new UnprocessableEntityException(`Cannot cancel job in ${job.status} status`);
    }

    const isLate = ['dispatched', 'en_route', 'arrived'].includes(job.status);

    const lateCancelFeeSetting = await this.prisma.setting.findUnique({
      where: { key: 'late_cancellation_fee' },
    });
    const lateFee = parseFloat(lateCancelFeeSetting?.value ?? '500');

    if (job.vehicleId) {
      await this.prisma.vehicle.update({
        where: { id: job.vehicleId },
        data:  { status: 'available' },
      });
    }

    return this.prisma.jobRequest.update({
      where: { id },
      data: {
        status:             'cancelled',
        cancelledBy:        dto.cancelledBy,
        cancellationReason: dto.reason,
        lateCancellation:   isLate,
        lateCancelFee:      isLate ? lateFee : 0,
      },
    });
  }

  async updateStatus(id: string, dto: UpdateStatusDto, userId: string) {
    const job = await this.findOne(id);

    if (!canTransition(job.status as JobStatus, dto.status)) {
      throw new UnprocessableEntityException(`Invalid transition: ${job.status} → ${dto.status}`);
    }

    const data: any = { status: dto.status };

    switch (dto.status) {
      case JobStatus.DISPATCHED:
        data.dispatchedAt = new Date();
        break;
      case JobStatus.ARRIVED:
        data.arrivedAt = new Date();
        break;
      case JobStatus.COLLECTED:
        data.collectedAt = new Date();
        break;
      case JobStatus.COMPLETED:
        data.completedAt = new Date();
        if (job.vehicleId) {
          await this.prisma.vehicle.update({
            where: { id: job.vehicleId },
            data:  { status: 'available' },
          });
        }
        break;
    }

    const updated = await this.prisma.jobRequest.update({ where: { id }, data });

    const ADMIN_STEP_MAP: Partial<Record<string, number>> = {
      sent_to_lab: 12,
      processing:  14,
    };

    const stepToUpdate = ADMIN_STEP_MAP[dto.status];
    if (stepToUpdate !== undefined) {
      await this.prisma.jobTimeline.updateMany({
        where: { jobRequestId: id, stepNumber: { lt: stepToUpdate } },
        data:  { status: 'done' },
      });
      await this.prisma.jobTimeline.updateMany({
        where: { jobRequestId: id, stepNumber: stepToUpdate },
        data:  { status: 'active', timestamp: new Date() },
      });
      await this.prisma.jobTimeline.updateMany({
        where: { jobRequestId: id, stepNumber: { gt: stepToUpdate } },
        data:  { status: 'pending' },  // ← timestamp removed
      });
    }

    return updated;
  }

  async getTimeline(id: string) {
    await this.findOne(id);
    return this.timelineService.getTimeline(id);
  }

  async getAvailableVehicles(id: string) {
    const job = await this.findOne(id);
    if (!job.branchId || !job.latitude || !job.longitude) {
      throw new BadRequestException('Job has no branch or location assigned');
    }
    return this.assignmentService.getAvailableVehiclesForJob(
      job.branchId,
      Number(job.latitude),
      Number(job.longitude),
    );
  }
}