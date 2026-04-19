import {
  Controller, Get, Post, Patch,
  Body, Param, Query,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiParam,
} from '@nestjs/swagger';
import { JobRequestsService } from './job-requests.service';
import { CreateJobDto } from './dto/create-job.dto';
import { AllocateJobDto } from './dto/allocate-job.dto';
import { RejectJobDto } from './dto/reject-job.dto';
import { CancelJobDto } from './dto/cancel-job.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { FilterJobsDto } from './dto/filter-jobs.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Job Requests')
@ApiBearerAuth()
@Controller('jobs')
export class JobRequestsController {
  constructor(private readonly jobRequestsService: JobRequestsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FRONT_OFFICE, UserRole.LAB_MANAGER)
  @ApiOperation({ summary: 'Create a new job request (admin booking)' })
  create(@Body() dto: CreateJobDto, @CurrentUser() user: any) {
    return this.jobRequestsService.create(dto, user?.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all job requests with filters' })
  findAll(@Query() dto: FilterJobsDto, @CurrentUser() user: any) {
    const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
    return this.jobRequestsService.findAll(dto, user?.branchId, isSuperAdmin);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job request by ID (tracking page)' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.jobRequestsService.findOne(id);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get job 21-step timeline' })
  @ApiParam({ name: 'id', type: String })
  getTimeline(@Param('id', ParseUuidPipe) id: string) {
    return this.jobRequestsService.getTimeline(id);
  }

  @Get(':id/available-vehicles')
  @ApiOperation({ summary: 'Get available vehicles for allocation modal' })
  @ApiParam({ name: 'id', type: String })
  getAvailableVehicles(@Param('id', ParseUuidPipe) id: string) {
    return this.jobRequestsService.getAvailableVehicles(id);
  }

  @Post(':id/accept')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FRONT_OFFICE)
  @ApiOperation({ summary: 'Accept a job request' })
  @ApiParam({ name: 'id', type: String })
  accept(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.jobRequestsService.accept(id, user?.id);
  }

  // POST (not PATCH) — matches integration map
  @Post(':id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FRONT_OFFICE)
  @ApiOperation({ summary: 'Reject a job request with reason' })
  @ApiParam({ name: 'id', type: String })
  reject(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: RejectJobDto,
    @CurrentUser() user: any,
  ) {
    return this.jobRequestsService.reject(id, dto, user?.id);
  }

  // POST (not PATCH) — matches integration map
  @Post(':id/allocate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FRONT_OFFICE)
  @ApiOperation({ summary: 'Allocate driver and vehicle to job' })
  @ApiParam({ name: 'id', type: String })
  allocate(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: AllocateJobDto,
    @CurrentUser() user: any,
  ) {
    return this.jobRequestsService.allocate(id, dto, user?.id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FRONT_OFFICE)
  @ApiOperation({ summary: 'Cancel a job request' })
  @ApiParam({ name: 'id', type: String })
  cancel(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: CancelJobDto,
    @CurrentUser() user: any,
  ) {
    return this.jobRequestsService.cancel(id, dto, user?.id);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FRONT_OFFICE, UserRole.LAB_MANAGER)
  @ApiOperation({ summary: 'Update job status (state machine enforced)' })
  @ApiParam({ name: 'id', type: String })
  updateStatus(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.jobRequestsService.updateStatus(id, dto, user?.id);
  }
}