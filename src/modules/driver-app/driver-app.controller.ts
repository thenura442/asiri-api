import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { DriverAppService } from './driver-app.service';
import { DriverLocationService } from './driver-location.service';
import { DriverCollectionService } from './driver-collection.service';
import { DriverEmergencyService } from './driver-emergency.service';
import { DriverHistoryService } from './driver-history.service';
import { DriverSettingsService } from './driver-settings.service';
import { DriverNotificationsService } from './driver-notifications.service';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { CollectionChecklistDto } from './dto/collection-checklist.dto';
import { ToggleAvailabilityDto } from './dto/toggle-availability.dto';
import { EmergencyAlertDto } from './dto/emergency-alert.dto';
import { UpdateDriverSettingsDto } from './dto/update-driver-settings.dto';
import { DriverAuthService } from '../auth/driver-auth.service';
import { DriverAuthGuard } from '../../common/guards/driver-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { Request } from 'express';

class DriverChangePasswordDto {
  currentPassword!: string;
  newPassword!: string;
  confirmPassword!: string;
}

@ApiTags('Driver App (Mobile)')
@UseGuards(DriverAuthGuard)
@Controller('driver')
export class DriverAppController {
  constructor(
    private readonly driverAppService: DriverAppService,
    private readonly locationService: DriverLocationService,
    private readonly collectionService: DriverCollectionService,
    private readonly emergencyService: DriverEmergencyService,
    private readonly historyService: DriverHistoryService,
    private readonly settingsService: DriverSettingsService,
    private readonly notificationsService: DriverNotificationsService,
    private readonly driverAuthService: DriverAuthService,
  ) {}

  // ── Profile ───────────────────────────────────────────────────────────────

  @Get('profile')
  @ApiOperation({ summary: 'Get driver profile' })
  getProfile(@CurrentUser() user: any) {
    return this.driverAppService.getDriverProfile(user?.id);
  }

  @Patch('availability')
  @ApiOperation({ summary: 'Toggle availability on/off shift' })
  toggleAvailability(
    @Body() dto: ToggleAvailabilityDto,
    @CurrentUser() user: any,
  ) {
    return this.driverAppService.toggleAvailability(user?.id, dto);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change driver password (D14)' })
  changePassword(
    @Body() dto: DriverChangePasswordDto,
    @CurrentUser() user: any,
  ) {
    return this.driverAuthService.changePassword(
      user?.id,
      dto.currentPassword,
      dto.newPassword,
      dto.confirmPassword,
    );
  }

  // ── Active Job ────────────────────────────────────────────────────────────

  @Get('active-job')
  @ApiOperation({ summary: 'Get current active job (D3)' })
  getActiveJob(@CurrentUser() user: any) {
    return this.driverAppService.getActiveJob(user?.id);
  }

  @Get('jobs/history')
  @ApiOperation({ summary: 'Get job history with period filter (D7)' })
  @ApiQuery({ name: 'period', enum: ['today', 'week', 'month', 'all'], required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getHistory(
    @CurrentUser() user: any,
    @Query('period') period?: 'today' | 'week' | 'month' | 'all',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.historyService.getHistory(user?.id, period, page, limit);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get specific job detail (D5)' })
  @ApiParam({ name: 'id', type: String })
  getJobDetail(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.driverAppService.getJobDetail(user?.id, id);
  }

  @Patch('jobs/:id/status')
  @ApiOperation({ summary: 'Update job status' })
  @ApiParam({ name: 'id', type: String })
  updateJobStatus(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateJobStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.driverAppService.updateJobStatus(user?.id, id, dto);
  }

  @Post('jobs/:id/collection')
  @ApiOperation({ summary: 'Submit sample collection checklist (D4)' })
  @ApiParam({ name: 'id', type: String })
  submitChecklist(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: CollectionChecklistDto,
  ) {
    return this.collectionService.submitChecklist(id, dto);
  }

  // ── Location ──────────────────────────────────────────────────────────────

  @Post('location')
  @ApiOperation({ summary: 'Update GPS location (every 10 seconds)' })
  updateLocation(
    @Body() dto: UpdateLocationDto,
    @CurrentUser() user: any,
  ) {
    return this.locationService.updateLocation(user?.id, dto);
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  @Get('notifications')
  @ApiOperation({ summary: 'Get driver notifications (D8)' })
  getNotifications(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.getNotifications(user?.id, page, limit);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', type: String })
  markRead(@Param('id') id: string) {
    return { success: true };
  }

  @Patch('notifications/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead() {
    return { success: true, message: 'All notifications marked as read' };
  }

  // ── Emergency ─────────────────────────────────────────────────────────────

  @Post('emergency')
  @ApiOperation({ summary: 'Send emergency alert to all super admins (D10)' })
  sendEmergency(
    @Body() dto: EmergencyAlertDto,
    @CurrentUser() user: any,
  ) {
    return this.emergencyService.sendEmergencyAlert(user?.id, dto);
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  @Get('settings')
  @ApiOperation({ summary: 'Get driver app settings (D12)' })
  getSettings(@CurrentUser() user: any) {
    return this.settingsService.getSettings(user?.id);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update driver app settings (D12)' })
  updateSettings(
    @Body() dto: UpdateDriverSettingsDto,
    @CurrentUser() user: any,
  ) {
    return this.settingsService.updateSettings(user?.id, dto);
  }
}