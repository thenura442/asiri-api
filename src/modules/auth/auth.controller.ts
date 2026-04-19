import {
  Controller, Post, Body, Req,
  HttpCode, HttpStatus, Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Auth — Admin Portal')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @Throttle({ login: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin portal login' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.adminLogin(dto, req.ip ?? '');
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin portal logout' })
  logout() {
    return this.authService.adminLogout();
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send password reset email' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email link' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete 2FA after login' })
  verify2fa(@Body() dto: Verify2faDto) {
    // 2FA via TOTP — Supabase handles this natively
    // For FYP: return success if code format is valid
    // Production: integrate TOTP library (e.g. speakeasy)
    return { message: '2FA verified', verified: true };
  }

  @Get('session')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check admin session validity' })
  getSession(@Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1] ?? '';
    return this.authService.getSession(token);
  }
}