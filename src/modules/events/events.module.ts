import { Global, Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { JobChannel } from './channels/job-channel';
import { AdminChannel } from './channels/admin-channel';
import { CustomerChannel } from './channels/customer-channel';
import { DriverChannel } from './channels/driver-channel';

@Global()
@Module({
  providers: [
    EventsService,
    JobChannel,
    AdminChannel,
    CustomerChannel,
    DriverChannel,
  ],
  exports: [EventsService],
})
export class EventsModule {}