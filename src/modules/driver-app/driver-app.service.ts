import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { EventsService } from '../events/events.service';
import { canTransition } from '../../common/utils/state-machine.util';
import { JobStatus } from '../../common/enums/job-status.enum';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { ToggleAvailabilityDto } from './dto/toggle-availability.dto';
import { calculateAge } from '../../common/utils/age-calculator.util';

const STATUS_STEP_MAP: Partial<Record<JobStatus, number>> = {
  [JobStatus.PENDING]:         1,
  [JobStatus.QUEUED]:          2,
  [JobStatus.ACCEPTED]:        3,
  [JobStatus.ALLOCATED]:       4,
  [JobStatus.DISPATCHED]:      5,
  [JobStatus.EN_ROUTE]:        6,
  [JobStatus.ARRIVED]:         7,
  [JobStatus.COLLECTING]:      8,
  [JobStatus.COLLECTED]:       9,
  [JobStatus.RETURNING]:       10,
  [JobStatus.AT_CENTER]:       11,
  [JobStatus.SENT_TO_LAB]:     12,
  [JobStatus.LAB_RECEIVED]:    13,
  [JobStatus.PROCESSING]:      14,
  [JobStatus.REPORT_READY]:    15,
  [JobStatus.REPORT_REVIEWED]: 16,
  [JobStatus.COMPLETED]:       17,
};

@Injectable()
export class DriverAppService {
  constructor(
    private prisma: PrismaService,
    private events: EventsService,
  ) {}

  async getActiveJob(driverId: string) {
    const job = await this.prisma.jobRequest.findFirst({
      where: {
        driverId,
        status: {
          notIn: ['completed', 'cancelled', 'rejected', 'failed'],
        },
      },
      include: {
        patient: {
          select: {
            id: true, fullName: true, phone: true, address: true,
            landmark: true, dateOfBirth: true, gender: true,
            flag: true, allergies: true, pendingCharges: true,
          },
        },
        tests: {
          include: {
            test: {
              select: { name: true, code: true, sampleType: true, prescriptionReq: true },
            },
          },
        },
        vehicle: {
          select: { id: true, plateNumber: true, vehicleType: true, makeModel: true },
        },
        branch: {
          select: { id: true, name: true, phone: true, managerName: true, managerPhone: true },
        },
      },
    });

    const driver = await this.prisma.driver.findFirst({
      where: { id: driverId },
      select: { isAvailable: true },
    });

    if (!job) {
      return { hasActiveJob: false, isOnline: driver?.isAvailable ?? false, job: null };
    }

    return {
      hasActiveJob: true,
      isOnline: driver?.isAvailable ?? false,
      job: {
        ...job,
        patientLatitude:  job.latitude  ? Number(job.latitude)  : null,
        patientLongitude: job.longitude ? Number(job.longitude) : null,
        patient: job.patient
          ? { ...job.patient, age: calculateAge(job.patient.dateOfBirth), specialInstructions: null }
          : null,
      },
    };
  }

  async getJobDetail(driverId: string, jobId: string) {
    const job = await this.prisma.jobRequest.findFirst({
      where: { id: jobId, driverId },
      include: {
        patient: {
          select: {
            id: true, fullName: true, phone: true, address: true,
            landmark: true, dateOfBirth: true, gender: true,
            flag: true, pendingCharges: true,
          },
        },
        tests: {
          include: {
            test: {
              select: { name: true, code: true, sampleType: true, prescriptionReq: true },
            },
          },
        },
        vehicle: {
          select: { id: true, plateNumber: true, vehicleType: true, makeModel: true },
        },
        branch: {
          select: { id: true, name: true, phone: true, managerName: true, managerPhone: true },
        },
        timeline: { orderBy: { stepNumber: 'asc' } },
      },
    });

    if (!job) throw new NotFoundException('Job not found');

    return {
      ...job,
      patientLatitude:  job.latitude  ? Number(job.latitude)  : null,
      patientLongitude: job.longitude ? Number(job.longitude) : null,
      patient: job.patient
        ? { ...job.patient, age: calculateAge(job.patient.dateOfBirth), specialInstructions: null }
        : null,
    };
  }

  async getDriverProfile(driverId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { id: driverId },
      include: {
        branch: {
          select: { id: true, name: true, type: true, phone: true, managerName: true, managerPhone: true },
        },
        driverSettings: true,
      },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    let licenseExpiryWarning: 'none' | 'expiring_soon' | 'expired' = 'none';
    if (driver.licenseExpiry < new Date()) {
      licenseExpiryWarning = 'expired';
    } else if (driver.licenseExpiry <= thirtyDaysFromNow) {
      licenseExpiryWarning = 'expiring_soon';
    }

    return {
      ...driver,
      isOnline: driver.isAvailable,
      licenseExpiryWarning,
      staffId: null,
    };
  }

  async updateJobStatus(driverId: string, jobId: string, dto: UpdateJobStatusDto) {
    const job = await this.prisma.jobRequest.findFirst({
      where: { id: jobId, driverId },
      include: { patient: { select: { id: true } } },
    });
    if (!job) throw new NotFoundException('Job not found or not assigned to you');

    if (!canTransition(job.status as JobStatus, dto.status)) {
      throw new UnprocessableEntityException(
        `Invalid transition: ${job.status} → ${dto.status}`,
      );
    }

    const data: any = { status: dto.status };

    switch (dto.status) {
      case JobStatus.DISPATCHED: data.dispatchedAt = new Date(); break;
      case JobStatus.ARRIVED:    data.arrivedAt    = new Date(); break;
      case JobStatus.COLLECTED:  data.collectedAt  = new Date(); break;
    }

    const updated = await this.prisma.jobRequest.update({
      where: { id: jobId },
      data,
    });

    const currentStep = STATUS_STEP_MAP[dto.status];
    if (currentStep !== undefined) {
      await this.prisma.jobTimeline.updateMany({
        where: { jobRequestId: jobId, stepNumber: { lt: currentStep } },
        data:  { status: 'done' },
      });
      await this.prisma.jobTimeline.updateMany({
        where: { jobRequestId: jobId, stepNumber: currentStep },
        data:  { status: 'active', timestamp: new Date() },
      });
      await this.prisma.jobTimeline.updateMany({
        where: { jobRequestId: jobId, stepNumber: { gt: currentStep } },
        data:  { status: 'pending' },  // ← timestamp removed
      });
    }

    await this.events.onJobStatusChanged({
      jobId,
      requestNumber: job.requestNumber,
      status:        dto.status,
      patientId:     job.patient?.id,
      driverId,
    });

    return {
      updated:   true,
      newStatus: dto.status,
      timestamp: new Date().toISOString(),
    };
  }

  async toggleAvailability(driverId: string, dto: ToggleAvailabilityDto) {
    const isOnline = (dto as any).isOnline ?? (dto as any).isAvailable;

    if (!isOnline) {
      const activeJob = await this.prisma.jobRequest.findFirst({
        where: {
          driverId,
          status: { in: ['dispatched', 'en_route', 'arrived', 'collecting'] },
        },
      });
      if (activeJob) {
        throw new BadRequestException('Cannot go offline with an active dispatched job');
      }
    }

    return this.prisma.driver.update({
      where: { id: driverId },
      data:  { isAvailable: isOnline },
    });
  }
}