import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { SlotAvailabilityService } from './slot-availability.service';
import { JobRequestsModule } from '../job-requests/job-requests.module';

@Module({
  imports: [JobRequestsModule],
  controllers: [BookingController],
  providers: [BookingService, SlotAvailabilityService],
  exports: [BookingService],
})
export class BookingModule {}