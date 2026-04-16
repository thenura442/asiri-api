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

// Feature modules — add one by one as you build them
import { AuthModule } from './modules/auth/auth.module';
import { BranchesModule } from './modules/branches/branches.module';
import { UsersModule } from './modules/users/users.module';

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
      ],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 60000, limit: 100 },
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
  ],
  providers: [
    // Global rate limiting
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
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