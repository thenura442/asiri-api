import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CollectionChecklistDto } from './dto/collection-checklist.dto';

@Injectable()
export class DriverCollectionService {
  constructor(private prisma: PrismaService) {}

  async submitChecklist(jobId: string, dto: CollectionChecklistDto) {
    const job = await this.prisma.jobRequest.findFirst({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Job not found');

    // Update each test status
    for (const item of dto.items) {
      await this.prisma.jobRequestTest.update({
        where: { id: item.jobRequestTestId },
        data: {
          status: item.status,
          collectionNotes: item.notes ?? item.failReason ?? null,
        },
      });
    }

    // Check if all collected
    const allCollected = dto.items.every((i) => i.status === 'collected');
    const anyFailed = dto.items.some((i) => i.status === 'failed');

    if (allCollected) {
      await this.prisma.jobRequest.update({
        where: { id: jobId },
        data: { status: 'collected', collectedAt: new Date() },
      });
    } else if (anyFailed) {
      await this.prisma.jobRequest.update({
        where: { id: jobId },
        data: { status: 'failed' },
      });
    }

    return { message: 'Collection checklist submitted' };
  }
}