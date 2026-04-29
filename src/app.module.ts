import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';

// Config
import appConfig from './config/app.config';
import supabaseConfig from './config/supabase.config';
import jwtConfig from './config/jwt.config';
import brevoConfig from './config/brevo.config';
import firebaseConfig from './config/firebase.config';
import osrmConfig from './config/osrm.config';
import googleOAuthConfig from './config/google-oauth.config';

// Core
import { DatabaseModule } from './core/database/database.module';
import { SupabaseModule } from './core/supabase/supabase.module';
import { EmailModule } from './core/email/email.module';
import { OsrmModule } from './core/osrm/osrm.module';
import { StorageModule } from './core/storage/storage.module';
import { PushModule } from './core/push/push.module';
import { SmsModule } from './core/sms/sms.module';
import { ExportModule } from './core/export/export.module';

// Guards
import { SupabaseAuthGuard } from './common/guards/supabase-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { CustomThrottlerGuard } from './common/guards/throttler.guard';

//GEO
import nominatimConfig from './config/nominatim.config';

// Feature modules — add one by one as you build them
import { AuthModule } from './modules/auth/auth.module';
import { BranchesModule } from './modules/branches/branches.module';
import { UsersModule } from '@modules/users/users.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { PatientsModule } from './modules/patients/patients.module';
import { TestsModule } from './modules/tests/tests.module';
import { JobRequestsModule } from './modules/job-requests/job-requests.module';
import { LabModule } from './modules/lab/lab.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ProfileModule } from './modules/profile/profile.module';
import { EscalationsModule } from './modules/escalations/escalations.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { EventsModule } from './modules/events/events.module';
import { GeoModule } from './modules/geo/geo.module';
import { BookingModule } from './modules/booking/booking.module';
import { CustomerModule } from './modules/customer/customer.module';
import { DriverAppModule } from './modules/driver-app/driver-app.module';

@Module({
  imports: [
    // Config (global)
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        supabaseConfig,
        jwtConfig,
        brevoConfig,
        firebaseConfig,
        osrmConfig,
        googleOAuthConfig,
        nominatimConfig,
      ],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 60000, limit: 2000 },
      { name: 'login', ttl: 60000, limit: 5 },
    ]),

    // Cron jobs
    ScheduleModule.forRoot(),

    // Core singleton services
    DatabaseModule,
    SupabaseModule,
    EmailModule,
    OsrmModule,
    StorageModule,
    PushModule,
    SmsModule,
    ExportModule,

    // Feature modules
    AuthModule,
    BranchesModule,
    UsersModule,
    VehiclesModule,
    DriversModule,
    PatientsModule,
    TestsModule,
    JobRequestsModule,
    LabModule,
    NotificationsModule,
    UploadsModule,
    SettingsModule,
    ProfileModule,
    EscalationsModule,
    DashboardModule,
    SchedulerModule,
    EventsModule,
    GeoModule,
    BookingModule,
    CustomerModule,
    DriverAppModule,
  ],
  providers: [
    // Global rate limiting
    // {
    //   provide: APP_GUARD,
    //   useClass: CustomThrottlerGuard,
    // },
    // Global auth guard
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
    // Global roles guard
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}