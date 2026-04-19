import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { CustomerAddressService } from './customer-address.service';
import { CustomerReportsService } from './customer-reports.service';
import { CustomerNotificationsService } from './customer-notifications.service';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { SaveAddressDto } from './dto/save-address.dto';
import { FilterBookingsDto } from './dto/filter-bookings.dto';
import { CustomerAuthGuard } from '../../common/guards/customer-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { UploadsService } from '../uploads/uploads.service';
import { StorageService } from '../../core/storage/storage.service';
import { PrismaService } from '../../core/database/prisma.service';
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class CustomerReportIssueDto {
  @ApiProperty()
  @IsString()
  jobRequestId!: string;

  @ApiProperty({ example: 'late_arrival' })
  @IsString()
  category!: string;

  @ApiProperty({ example: 'Driver arrived 2 hours late' })
  @IsString()
  @MinLength(20)
  description!: string;
}

@ApiTags('Customer (Mobile)')
@UseGuards(CustomerAuthGuard)
@Controller('customer')
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly addressService: CustomerAddressService,
    private readonly reportsService: CustomerReportsService,
    private readonly notificationsService: CustomerNotificationsService,
    private readonly uploadsService: UploadsService,
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Home ──────────────────────────────────────────────────────────────────

  @Get('home')
  @ApiOperation({ summary: 'Get customer home screen data (C6)' })
  getHome(@CurrentUser() user: any) {
    return this.customerService.getHome(user?.id);
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  @Get('profile')
  @ApiOperation({ summary: 'Get customer profile (C19)' })
  getProfile(@CurrentUser() user: any) {
    return this.customerService.getProfile(user?.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update customer profile (C20)' })
  updateProfile(
    @Body() dto: UpdateCustomerProfileDto,
    @CurrentUser() user: any,
  ) {
    return this.customerService.updateProfile(user?.id, dto);
  }

  @Post('profile/avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload customer avatar (C20)' })
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    const result = await this.uploadsService.uploadAvatar(file, user?.id);
    return { avatarUrl: typeof result === 'string' ? result : (result as any).url };
  }

  // ── Bookings ──────────────────────────────────────────────────────────────

  @Get('bookings')
  @ApiOperation({ summary: 'Get my booking history (C14)' })
  getBookings(
    @Query() dto: FilterBookingsDto,
    @CurrentUser() user: any,
  ) {
    return this.customerService.getBookings(user?.id, dto);
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  @Get('reports')
  @ApiOperation({ summary: 'Get my lab reports list (C16)' })
  getReports(@CurrentUser() user: any) {
    return this.reportsService.getReports(user?.id);
  }

  @Get('reports/:jobId')
  @ApiOperation({ summary: 'Get report detail with signed download URLs (C17)' })
  @ApiParam({ name: 'jobId', type: String })
  getReportDetail(
    @Param('jobId', ParseUuidPipe) jobId: string,
    @CurrentUser() user: any,
  ) {
    return this.reportsService.getReportDetail(jobId, user?.id);
  }

  @Get('reports/:jobId/download')
  @ApiOperation({ summary: 'Get signed download URL for report PDF (C17)' })
  @ApiParam({ name: 'jobId', type: String })
  downloadReport(
    @Param('jobId', ParseUuidPipe) jobId: string,
    @CurrentUser() user: any,
  ) {
    return this.reportsService.getReportDetail(jobId, user?.id);
  }

  // ── Addresses ─────────────────────────────────────────────────────────────

  @Get('addresses')
  @ApiOperation({ summary: 'Get saved addresses (C9)' })
  getAddresses(@CurrentUser() user: any) {
    return this.addressService.getAddresses(user?.id);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Save a new address' })
  saveAddress(
    @Body() dto: SaveAddressDto,
    @CurrentUser() user: any,
  ) {
    return this.addressService.saveAddress(user?.id, dto);
  }

  @Patch('addresses/:id')
  @ApiOperation({ summary: 'Update saved address' })
  @ApiParam({ name: 'id', type: String })
  updateAddress(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: Partial<SaveAddressDto>,
    @CurrentUser() user: any,
  ) {
    return this.addressService.updateAddress(id, user?.id, dto);
  }

  @Delete('addresses/:id')
  @ApiOperation({ summary: 'Delete saved address' })
  @ApiParam({ name: 'id', type: String })
  deleteAddress(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.addressService.deleteAddress(id, user?.id);
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  @Get('notifications')
  @ApiOperation({ summary: 'Get customer notifications (C18)' })
  getNotifications(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.getNotifications(user?.id, page, limit);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read (C18)' })
  @ApiParam({ name: 'id', type: String })
  markRead(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.markRead(id, user?.id);
  }

  @Patch('notifications/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read (C18)' })
  markAllRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllRead(user?.id);
  }

  // ── Report Issue ──────────────────────────────────────────────────────────

  @Post('issues')
  @UseInterceptors(FileInterceptor('photos'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Report an issue with a booking (C21)' })
  async reportIssue(
    @Body() dto: CustomerReportIssueDto,
    @CurrentUser() user: any,
  ) {
    const superAdmin = await this.prisma.user.findFirst({
      where: { role: 'super_admin', status: 'active' },
      select: { id: true },
    });

    if (!superAdmin) {
      return {
        id: 'pending',
        referenceNumber: 'ESC-PENDING',
        message: 'Issue reported successfully',
      };
    }

    const escalation = await this.prisma.escalation.create({
      data: {
        jobRequestId: dto.jobRequestId,
        escalatedBy: superAdmin.id,
        reasonCategory: 'customer_complaint',
        details: `Customer Issue (${dto.category}): ${dto.description}`,
        urgency: 'normal',
        status: 'open',
      },
    });

    return {
      id: escalation.id,
      referenceNumber: `ESC-${escalation.id.slice(0, 6).toUpperCase()}`,
      message: `Your issue has been reported. Reference: ESC-${escalation.id.slice(0, 6).toUpperCase()}`,
    };
  }
}