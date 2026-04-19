import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { CustomerAddressService } from './customer-address.service';
import { CustomerReportsService } from './customer-reports.service';
import { CustomerNotificationsService } from './customer-notifications.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  controllers: [CustomerController],
  providers: [
    CustomerService,
    CustomerAddressService,
    CustomerReportsService,
    CustomerNotificationsService,
  ],
  exports: [CustomerService],
})
export class CustomerModule {}