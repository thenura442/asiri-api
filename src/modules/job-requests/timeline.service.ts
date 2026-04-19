import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TimelineStepStatus } from '@prisma/client';

// 21-step job timeline definitions
const TIMELINE_STEPS = [
  { step: 1,  title: 'Request Received',        description: 'Job request submitted successfully' },
  { step: 2,  title: 'Branch Assigned',          description: 'Nearest available branch identified' },
  { step: 3,  title: 'Branch Accepted',          description: 'Branch confirmed the job request' },
  { step: 4,  title: 'Vehicle Allocated',        description: 'Driver and vehicle assigned' },
  { step: 5,  title: 'Driver Dispatched',        description: 'Driver departed from branch' },
  { step: 6,  title: 'En Route to Patient',      description: 'Driver travelling to patient location' },
  { step: 7,  title: 'Arrived at Location',      description: 'Driver arrived at patient location' },
  { step: 8,  title: 'Sample Collection',        description: 'Collecting samples from patient' },
  { step: 9,  title: 'Samples Collected',        description: 'All samples successfully collected' },
  { step: 10, title: 'Returning to Center',      description: 'Driver returning with samples' },
  { step: 11, title: 'Arrived at Center',        description: 'Samples arrived at collecting center' },
  { step: 12, title: 'Sent to Lab',              description: 'Samples dispatched to laboratory' },
  { step: 13, title: 'Lab Received',             description: 'Laboratory received the samples' },
  { step: 14, title: 'Processing',               description: 'Laboratory processing samples' },
  { step: 15, title: 'Report Ready',             description: 'Test results ready for review' },
  { step: 16, title: 'Report Reviewed',          description: 'Report reviewed and approved' },
  { step: 17, title: 'Completed',                description: 'Job successfully completed' },
  { step: 18, title: 'Payment Collected',        description: 'Payment received from patient' },
  { step: 19, title: 'Hard Copy Available',      description: 'Hard copy report available for pickup' },
  { step: 20, title: 'Report Downloaded',        description: 'Patient downloaded digital report' },
  { step: 21, title: 'Case Closed',              description: 'All steps completed successfully' },
];

@Injectable()
export class TimelineService {
  constructor(private prisma: PrismaService) {}

  async initializeTimeline(jobRequestId: string): Promise<void> {
    const steps = TIMELINE_STEPS.map((step) => ({
      jobRequestId,
      stepNumber: step.step,
      title: step.title,
      description: step.description,
      status: (step.step === 1 ? 'active' : 'pending') as TimelineStepStatus,
      timestamp: new Date(),
    }));

    await this.prisma.jobTimeline.createMany({ data: steps });
  }

  async advanceStep(
    jobRequestId: string,
    stepNumber: number,
    performedBy?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.prisma.jobTimeline.updateMany({
      where: { jobRequestId, stepNumber },
      data: {
        status: 'done' as TimelineStepStatus,
        timestamp: new Date(),
        performedBy,
        metadata,
      },
    });

    const nextStep = stepNumber + 1;
    if (nextStep <= 21) {
      await this.prisma.jobTimeline.updateMany({
        where: { jobRequestId, stepNumber: nextStep },
        data: { status: 'active' as TimelineStepStatus, timestamp: new Date() },
      });
    }
  }

  async markStepFailed(
    jobRequestId: string,
    stepNumber: number,
    reason: string,
    performedBy?: string,
  ): Promise<void> {
    await this.prisma.jobTimeline.updateMany({
      where: { jobRequestId, stepNumber },
      data: {
        status: 'failed' as TimelineStepStatus,
        timestamp: new Date(),
        performedBy,
        metadata: { reason },
      },
    });
  }

  async getTimeline(jobRequestId: string) {
    return this.prisma.jobTimeline.findMany({
      where: { jobRequestId },
      orderBy: { stepNumber: 'asc' },
      include: {
        performer: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });
  }
}