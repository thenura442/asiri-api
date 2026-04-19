import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerAuthService } from './customer-auth.service';
import { DriverAuthController } from './driver-auth.controller';
import { DriverAuthService } from './driver-auth.service';

@Module({
  controllers: [
    AuthController,
    CustomerAuthController,
    DriverAuthController,
  ],
  providers: [
    AuthService,
    CustomerAuthService,
    DriverAuthService,
  ],
  exports: [AuthService, CustomerAuthService, DriverAuthService],
})
export class AuthModule {}