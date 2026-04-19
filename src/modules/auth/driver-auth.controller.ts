import {
  Controller, Post, Body, Get, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { DriverAuthService } from './driver-auth.service';
import { DriverLoginDto } from './dto/driver-login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class Driver2faDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;

  @ApiProperty()
  @IsString()
  driverId!: string;
}

@ApiTags('Auth — Driver Mobile')
@Controller('auth/driver')
export class DriverAuthController {
  constructor(private readonly driverAuthService: DriverAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Driver login with phone + password' })
  login(@Body() dto: DriverLoginDto) {
    return this.driverAuthService.login(dto);
  }

  @Public()
  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete driver 2FA verification' })
  verify2fa(@Body() dto: Driver2faDto) {
    return this.driverAuthService.verify2fa(dto.code, dto.driverId);
  }

  @Public()
  @Get('session')
  @ApiOperation({ summary: 'Check driver session validity' })
  getSession(@Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1] ?? '';
    return this.driverAuthService.getDriverSession(token);
  }
}