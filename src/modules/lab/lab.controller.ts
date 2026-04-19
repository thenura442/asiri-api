import {
  Controller, Get, Post, Patch,
  Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { LabService } from './lab.service';
import { ReceiveSamplesDto } from './dto/receive-samples.dto';
import { ReportIssueDto } from './dto/report-issue.dto';
import { UploadReportDto } from './dto/upload-report.dto';
import { FilterLabDto } from './dto/filter-lab.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Lab Approvals')
@ApiBearerAuth()
@Controller('lab')
export class LabController {
  constructor(private readonly labService: LabService) {}

  @Get('approvals')
  @Roles(UserRole.SUPER_ADMIN, UserRole.LAB_MANAGER, UserRole.LAB_TECHNICIAN)
  @ApiOperation({ summary: 'Get lab approval queue' })
  getApprovals(@Query() dto: FilterLabDto, @CurrentUser() user: any) {
    return this.labService.getApprovals(dto, user);
  }

  @Post('receive-samples')
  @Roles(UserRole.SUPER_ADMIN, UserRole.LAB_MANAGER, UserRole.LAB_TECHNICIAN)
  @ApiOperation({ summary: 'Mark samples as received at lab (§10.2)' })
  receiveSamples(
    @Body() dto: ReceiveSamplesDto,
    @CurrentUser() user: any,
  ) {
    return this.labService.receiveSamples(dto.jobRequestId, dto, user?.id);
  }

  @Post('report-issue')
  @Roles(UserRole.SUPER_ADMIN, UserRole.LAB_MANAGER, UserRole.LAB_TECHNICIAN)
  @ApiOperation({ summary: 'Report issue with a test sample (§10.4)' })
  reportIssue(
    @Body() dto: ReportIssueDto,
    @CurrentUser() user: any,
  ) {
    return this.labService.reportIssue(dto.jobRequestId, dto, user?.id);
  }

  // jobId and jobRequestTestId both come from path — no body field confusion
  @Post(':jobId/:jobRequestTestId/upload-report')
  @Roles(UserRole.SUPER_ADMIN, UserRole.LAB_MANAGER, UserRole.LAB_TECHNICIAN)
  @ApiOperation({ summary: 'Upload test report PDF URL (§10.3)' })
  @ApiParam({ name: 'jobId', type: String })
  @ApiParam({ name: 'jobRequestTestId', type: String })
  uploadReport(
    @Param('jobId', ParseUuidPipe) jobId: string,
    @Param('jobRequestTestId', ParseUuidPipe) jobRequestTestId: string,
    @Body() dto: UploadReportDto,
    @CurrentUser() user: any,
  ) {
    dto.jobRequestTestId = jobRequestTestId;
    return this.labService.uploadReport(jobId, dto, user?.id);
  }

  @Patch(':jobId/review-report')
  @Roles(UserRole.SUPER_ADMIN, UserRole.LAB_MANAGER)
  @ApiOperation({ summary: 'Mark report as reviewed (LM/SA only)' })
  @ApiParam({ name: 'jobId', type: String })
  reviewReport(
    @Param('jobId', ParseUuidPipe) jobId: string,
    @CurrentUser() user: any,
  ) {
    return this.labService.reviewReport(jobId, user?.id);
  }
}