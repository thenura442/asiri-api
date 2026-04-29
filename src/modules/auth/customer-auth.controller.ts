import {
  Controller, Post, Body, Get, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerRegisterDto } from './dto/customer-register.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Auth — Customer Mobile')
@Controller('auth/customer')
export class CustomerAuthController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new customer (3-step)' })
  register(@Body() dto: CustomerRegisterDto) {
    return this.customerAuthService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer login with phone + password' })
  login(@Body() dto: CustomerLoginDto) {
    return this.customerAuthService.login(dto);
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google OAuth sign-in' })
  googleAuth(@Body() dto: GoogleAuthDto) {
    return this.customerAuthService.googleAuth(dto);
  }

  @Public()
  @Get('session')
  @ApiOperation({ summary: 'Check customer session validity' })
  getSession(@Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1] ?? '';
    return this.customerAuthService.getCustomerSession(token);
  }
}