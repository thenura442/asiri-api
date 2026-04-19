import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard KPI stats (role-filtered)' })
  getStats(@CurrentUser() user: any) {
    return this.dashboardService.getStats(user);
  }

  @Get('recent-jobs')
  @ApiOperation({ summary: 'Get recent job requests for dashboard widget' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getRecentJobs(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
  ) {
    return this.dashboardService.getRecentJobs(user, limit);
  }

  // Map expects /dashboard/drivers (not /driver-status)
  @Get('drivers')
  @ApiOperation({ summary: 'Get driver status list for dashboard panel' })
  getDrivers(@CurrentUser() user: any) {
    return this.dashboardService.getDrivers(user);
  }

  @Get('fleet-locations')
  @ApiOperation({ summary: 'Get live fleet GPS locations for dashboard map' })
  getFleetLocations(@CurrentUser() user: any) {
    return this.dashboardService.getFleetLocations(user);
  }
}