import {
  Controller, Get, Post, Patch,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CalculatePriceDto } from './dto/calculate-price.dto';
import { AvailableSlotsQueryDto } from './dto/available-slots-query.dto';
import { CustomerAuthGuard } from '../../common/guards/customer-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UseGuards as _UseGuards } from '@nestjs/common';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Booking (Mobile Customer)')
@UseGuards(CustomerAuthGuard)
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('slots')
  @ApiOperation({ summary: 'Get available time slots near patient location (C10)' })
  getAvailableSlots(@Query() dto: AvailableSlotsQueryDto) {
    return this.bookingService.getAvailableSlots(dto);
  }

  @Post('calculate-price')
  @ApiOperation({ summary: 'Calculate price before booking (C11)' })
  calculatePrice(@Body() dto: CalculatePriceDto) {
    return this.bookingService.calculatePrice(dto);
  }

  // Primary booking creation endpoint
  @Post()
  @ApiOperation({ summary: 'Create a new booking (C11)' })
  createBooking(
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: any,
  ) {
    return this.bookingService.createBooking(dto, user?.id);
  }

  // Alias — integration map uses /create
  @Post('create')
  @ApiOperation({ summary: 'Create a new booking — alias (C11)' })
  createBookingAlias(
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: any,
  ) {
    return this.bookingService.createBooking(dto, user?.id);
  }

  @Get('my-bookings')
  @ApiOperation({ summary: 'Get my bookings' })
  getMyBookings(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.bookingService.getMyBookings(user?.id, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking detail (C15)' })
  @ApiParam({ name: 'id', type: String })
  getBookingDetail(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.bookingService.getBookingDetail(id, user?.id);
  }

  // Tracking — map uses /tracking (renamed from /track)
  @Get(':id/tracking')
  @ApiOperation({ summary: 'Track live booking status (C13)' })
  @ApiParam({ name: 'id', type: String })
  trackBooking(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.bookingService.trackBooking(id, user?.id);
  }

  // Cancel — map uses POST (not PATCH)
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking (C13)' })
  @ApiParam({ name: 'id', type: String })
  cancelBooking(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() user: any,
  ) {
    return this.bookingService.cancelBooking(id, user?.id, dto);
  }
}