import { Module } from '@nestjs/common';
import { JobRequestsController } from './job-requests.controller';
import { JobRequestsService } from './job-requests.service';
import { AssignmentService } from './assignment.service';
import { TimelineService } from './timeline.service';
import { PricingService } from './pricing.service';
import { AvailableVehiclesService } from './available-vehicles.service';

@Module({
  controllers: [JobRequestsController],
  providers: [
    JobRequestsService,
    AssignmentService,
    TimelineService,
    PricingService,
    AvailableVehiclesService,
  ],
  exports: [
    JobRequestsService,
    AssignmentService,
    TimelineService,
    PricingService,
  ],
})
export class JobRequestsModule {}