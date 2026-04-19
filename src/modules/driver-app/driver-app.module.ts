import { Module } from '@nestjs/common';
import { DriverAppController } from './driver-app.controller';
import { DriverAppService } from './driver-app.service';
import { DriverLocationService } from './driver-location.service';
import { DriverCollectionService } from './driver-collection.service';
import { DriverEmergencyService } from './driver-emergency.service';
import { DriverHistoryService } from './driver-history.service';
import { DriverSettingsService } from './driver-settings.service';
import { DriverNotificationsService } from './driver-notifications.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DriverAppController],
  providers: [
    DriverAppService,
    DriverLocationService,
    DriverCollectionService,
    DriverEmergencyService,
    DriverHistoryService,
    DriverSettingsService,
    DriverNotificationsService,
  ],
  exports: [DriverAppService],
})
export class DriverAppModule {}